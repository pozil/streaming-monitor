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
    EVT_CDC,
    CHANNEL_ALL_CDC,
    FILTER_CUSTOM,
    FILTER_ALL,
    isCDCChannel,
    getChannelPrefix,
    normalizeEvent,
    channelSort,
    isCustomChannel
} from 'c/streamingUtility';

const RERENDER_DELAY = 200;
const IGNORE_SUBCRIBE_ERRORS_DELAY = 4000;

const VIEW_MONITOR = 'monitor';
const VIEW_SUBSCRIBE_ALL = 'subscribeAll';
const VIEW_SUBSCRIBE = 'subscribe';
const VIEW_PUBLISH = 'publish';
const VIEW_REGISTER = 'register';
const VIEW_ORG_LIMITS = 'view-org-limits';
const VIEW_EVENT_USAGE_METRICS = 'view-event-usage-metrics';

export default class StreamingMonitor extends LightningElement {
    @track channels;
    @track subscriptions = [];

    view = VIEW_MONITOR;
    ignoreSubscribeErrors = false;
    eventsElement;
    rerenderTimeout;

    async connectedCallback() {
        setDebugFlag(true);

        onError((error) => this.handleStreamingError(error));

        try {
            this.channels = await getAllEventChannels();
        } catch (error) {
            console.error(JSON.stringify(error));
            throw new Error('Failed to retrieve streaming channels');
        }
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

    async handleSubscribeAll(event) {
        const { replayId, filter } = event.detail;
        console.log(
            `Subscribing to multiple streaming channels with filter ${filter} and replay ID ${replayId}`
        );

        try {
            // Build list of channels
            let channels = [];
            switch (filter) {
                case FILTER_ALL:
                    // Get all event channels
                    EVENT_TYPES.forEach((type) => {
                        const typeName = type.value;
                        if (typeName === EVT_CDC) {
                            // Use global channel for all CDC events
                            channels.push(CHANNEL_ALL_CDC);
                        } else {
                            // Get all channels for the other event types
                            const channelPrefix = getChannelPrefix(typeName);
                            this.channels[typeName].forEach((channelData) => {
                                channels.push(
                                    channelPrefix + channelData.value
                                );
                            });
                        }
                    });
                    break;
                case FILTER_CUSTOM:
                    // Get custom channels for all event types
                    EVENT_TYPES.forEach((type) => {
                        const typeName = type.value;
                        const channelPrefix = getChannelPrefix(typeName);
                        this.channels[typeName].forEach((channelData) => {
                            if (isCustomChannel(typeName, channelData.value)) {
                                channels.push(
                                    channelPrefix + channelData.value
                                );
                            }
                        });
                    });
                    break;
                case EVT_CDC:
                    // Use global channel for all CDC events
                    channels.push(CHANNEL_ALL_CDC);
                    break;
                default: {
                    // Add channels of given type
                    const channelPrefix = getChannelPrefix(filter);
                    this.channels[filter].forEach((channelData) => {
                        channels.push(channelPrefix + channelData.value);
                    });
                }
            }

            // Remove already subscribed channels
            channels = channels.filter(
                (channel) =>
                    !this.subscriptions.some((sub) => sub.channel === channel)
            );

            // Abort if there are no remaining channels
            if (channels.length === 0) {
                this.notify(
                    'warn',
                    'There are no channels to subscribe to with the specified filter and current subscriptions'
                );
                return;
            }

            // Temporarily ignore subscribe errors while subscribing to events
            this.ignoreSubscribeErrors = true;
            setTimeout(() => {
                this.ignoreSubscribeErrors = false;
            }, IGNORE_SUBCRIBE_ERRORS_DELAY);

            // Queue subscriptions
            const subscribePromises = channels.map((channel) => {
                return subscribe(channel, replayId, (streamingEvent) => {
                    this.handleStreamingEvent(streamingEvent);
                });
            });

            // Save susbcriptions and notify success once done
            const subscriptions = await Promise.all(subscribePromises);
            subscriptions.forEach((subscription) => {
                this.saveSubscription(subscription);
            });
            this.notify(
                'success',
                'Successfully subscribed to the specified channels'
            );
            this.view = VIEW_MONITOR;
        } catch (error) {
            console.error(error.message);
        }
    }

    async handleSubscribe(event) {
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

        // Subscribe
        const subscription = await subscribe(
            channel,
            replayId,
            (streamingEvent) => {
                this.handleStreamingEvent(streamingEvent);
            }
        );
        this.notify('success', 'Successfully subscribed', subscription.channel);
        this.saveSubscription(subscription);
        this.view = VIEW_MONITOR;
    }

    saveSubscription(subscription) {
        // Clone subscriptions due to @track array bug
        const subscriptions = [...this.subscriptions];
        subscriptions.push(subscription);
        subscriptions.sort(channelSort);
        this.subscriptions = subscriptions;
    }

    handleStreamingEvent(streamingEvent) {
        this.notify(
            'info',
            'Received event on channel',
            streamingEvent.channel
        );
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

    async handlePublish(event) {
        const eventParams = event.detail;
        try {
            await publishStreamingEvent(eventParams);
            this.notify(
                'success',
                `Successfully published event ${eventParams.eventName}`
            );
            this.view = VIEW_MONITOR;
        } catch (error) {
            console.error(JSON.stringify(error));
            this.notify('error', `Failed to publish ${eventParams.eventName}`);
        }
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

    get isOrgLimitsView() {
        return this.view === VIEW_ORG_LIMITS;
    }

    get isEventUsageMetricsView() {
        return this.view === VIEW_EVENT_USAGE_METRICS;
    }
}
