/* eslint-disable @lwc/lwc/no-async-operation */
/* eslint-disable no-console */
import { LightningElement, track } from 'lwc';
import {
    subscribe,
    unsubscribe,
    onError,
    setDebugFlag
} from 'lightning/empApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllEventChannels from '@salesforce/apex/StreamingMonitorController.getAllEventChannels';
import publishStreamingEvent from '@salesforce/apex/StreamingMonitorController.publishStreamingEvent';
import {
    EVENT_TYPES,
    EVT_CDC_STANDARD,
    CHANNEL_ALL_CDC,
    isCDCChannel,
    getChannelPrefix,
    normalizeEvent,
    channelSort
} from 'c/streamingUtility';

const RERENDER_DELAY = 200;
const IGNORE_SUBCRIBE_ERRORS_DELAY = 3000;

const VIEW_MONITOR = 'monitor';
const VIEW_SUBSCRIBE_ALL = 'subscribeAll';
const VIEW_SUBSCRIBE = 'subscribe';
const VIEW_PUBLISH = 'publish';
const VIEW_REGISTER = 'register';

export default class StreamingMonitor extends LightningElement {
    @track channels;
    @track subscriptions = [];

    view = VIEW_MONITOR;
    ignoreSubscribeErrors = false;
    eventsElement;
    rerenderTimeout;

    connectedCallback() {
        setDebugFlag(true);

        onError((error) => this.handleStreamingError(error));

        getAllEventChannels()
            .then((allChannels) => {
                this.channels = allChannels;
            })
            .catch((error) => {
                console.error(JSON.stringify(error));
                throw new Error('Failed to retrieve streaming channels');
            });

        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }

    disconnectedCallback() {
        this.handleUnsubscribeAll();
        window.removeEventListener('resize', this.handleWindowResize);
    }

    handleWindowResize() {
        // Debounce
        if (this.rerenderTimeout) {
            clearTimeout(this.rerenderTimeout);
        }
        this.rerenderTimeout = setTimeout(() => {
            const eventsElement = this.template.querySelector('c-events');
            if (eventsElement) {
                eventsElement.forceRerender();
            }
        }, RERENDER_DELAY);
    }

    handleNavigate(event) {
        this.view = event.detail;
    }

    handleSidebarToggle() {
        const eventsElement = this.template.querySelector('c-events');
        if (eventsElement) {
            eventsElement.forceRerender();
        }
    }

    notify(variant, title, message) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleStreamingError(error) {
        let showToast = true;
        let errorMessage =
            (error.subscription ? error.subscription + ' - ' : '') +
            (error.error
                ? error.error
                : "See browser's dev console for details");
        console.error('Streaming API error: ' + JSON.stringify(error));

        // Handle subscribe errors
        if (error.channel === '/meta/subscribe' && error.error) {
            // Remove faulty subscription
            const subChannel = error.subscription;
            const subIndex = this.subscriptions.findIndex(
                (s) => s.channel === subChannel
            );
            if (subIndex !== -1) {
                this.subscriptions.splice(subIndex, 1);
                console.warn(`Removing faulty subscription: ${subChannel}`);
            }

            const rawErrorMessage = error.error;
            // Invalid channel (inactive CDC channels)
            if (
                rawErrorMessage.startsWith(
                    '400::The channel specified is not valid'
                )
            ) {
                showToast =
                    !this.ignoreSubscribeErrors && isCDCChannel(subChannel);
                errorMessage = `Failed to subscribe to ${subChannel}. Is the Change Data Capture event active?`;
            }
            // Subscribe rejected by security policy
            else if (
                rawErrorMessage.startsWith('403:denied_by_security_policy')
            ) {
                showToast = !this.ignoreSubscribeErrors;
                errorMessage = `Failed to subscribe to ${subChannel}: ${rawErrorMessage}`;
            }
        }

        // Notify error with a toast
        if (showToast) {
            this.notify('error', 'Streaming API error', errorMessage);
        }
    }

    handleSubscribeAll(event) {
        console.log(`Subscribing to all streaming events`);
        const { replayId } = event.detail;

        // Temporarily ignore subscribe errors while subscribing to all events
        this.ignoreSubscribeErrors = true;
        setTimeout(() => {
            this.ignoreSubscribeErrors = false;
        }, IGNORE_SUBCRIBE_ERRORS_DELAY);

        // Build list of channels
        let channels = [];
        EVENT_TYPES.forEach((eventType) => {
            const eventTypeName = eventType.value;
            if (eventTypeName === EVT_CDC_STANDARD) {
                // Use global channel for all CDC events
                channels.push(CHANNEL_ALL_CDC);
            } else {
                // Get channels for specific event type
                const channelPrefix = getChannelPrefix(eventTypeName);
                this.channels[eventTypeName].forEach((channelData) => {
                    channels.push(channelPrefix + channelData.value);
                });
            }
        });
        // Remove already subscribed channels
        channels = channels.filter(
            (channel) =>
                !this.subscriptions.some((sub) => sub.channel === channel)
        );
        // Queue subscriptions
        const subscribePromises = channels.map((channel) => {
            return subscribe(channel, replayId, (streamingEvent) => {
                this.handleStreamingEvent(streamingEvent);
            });
        });
        // Save susbcriptions and notify success once done
        Promise.all(subscribePromises).then((subscriptions) => {
            subscriptions.forEach((subscription) => {
                this.saveSubscription(subscription);
            });
            this.notify('success', 'Successfully subscribed to all channels');
            this.view = VIEW_MONITOR;
        });
    }

    handleSubscribe(event) {
        const { channel, replayId } = event.detail;

        // Check for duplicate subscription
        if (this.subscriptions.some((sub) => sub.channel === channel)) {
            this.notify(
                'error',
                'Cannot subscribe',
                `Already subscribed to channel ${channel}`
            );
            return;
        }

        subscribe(channel, replayId, (streamingEvent) => {
            this.handleStreamingEvent(streamingEvent);
        }).then((subscription) => {
            this.notify(
                'success',
                'Successfully subscribed',
                subscription.channel
            );
            this.saveSubscription(subscription);
            this.view = VIEW_MONITOR;
        });
    }

    saveSubscription(subscription) {
        // Clone subscriptions due to @track array bug
        const subscriptions = [...this.subscriptions];
        subscriptions.push(subscription);
        subscriptions.sort(channelSort);
        this.subscriptions = subscriptions;
    }

    handleStreamingEvent(streamingEvent) {
        this.notify('info', 'Received event', streamingEvent.channel);
        console.log(
            'Received streaming event: ',
            JSON.stringify(streamingEvent)
        );
        // Add event to list
        const eventData = normalizeEvent(streamingEvent);
        if (!this.eventsElement) {
            this.eventsElement = this.template.querySelector('c-events');
        }
        this.eventsElement.addStreamingEvent(eventData);
    }

    handlePublish(event) {
        const eventParams = event.detail;
        publishStreamingEvent(eventParams)
            .then(() => {
                this.notify(
                    'success',
                    `Successfully published event ${eventParams.eventName}`
                );
                console.log(`Payload: `, eventParams.eventPayload);
                this.view = VIEW_MONITOR;
            })
            .catch((error) => {
                console.error(JSON.stringify(error));
                this.notify(
                    'error',
                    `Failed to publish ${eventParams.eventName}`
                );
            });
    }

    handleUnsubscribeAll() {
        this.subscriptions.forEach((subscription) => {
            unsubscribe(subscription, (response) => {
                if (!response.successful) {
                    console.error(JSON.stringify(response));
                }
            });
        });
        this.subscriptions = [];
        this.notify('success', 'Successfully unsubscribed from all channels');
    }

    handleUnsubscribe(event) {
        const { channel } = event.detail;
        let foundIndex = -1;
        const subscription = this.subscriptions.find((sub, index) => {
            if (sub.channel === channel) {
                foundIndex = index;
                return true;
            }
            return false;
        });
        if (foundIndex !== -1) {
            unsubscribe(subscription, (response) => {
                if (response.successful) {
                    this.notify(
                        'success',
                        'Successfully unsubscribed',
                        channel
                    );
                } else {
                    this.notify('error', 'Failed to unsubscribe', channel);
                    console.error(JSON.stringify(response));
                }
            });
            this.subscriptions.splice(foundIndex, 1);
        }
    }

    get isLoadingChannels() {
        return this.channels === undefined;
    }

    get monitorClasses() {
        return this.view === VIEW_MONITOR ? 'slds-show' : 'slds-hide';
    }

    get isActionView() {
        return (
            this.view === VIEW_SUBSCRIBE_ALL ||
            this.view === VIEW_SUBSCRIBE ||
            this.view === VIEW_PUBLISH ||
            this.view === VIEW_REGISTER
        );
    }
}
