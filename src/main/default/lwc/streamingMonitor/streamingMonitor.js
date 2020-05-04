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
    isCDCChannel,
    getChannelPrefix,
    normalizeEvent
} from 'c/streamingUtility';

// Time for which CDC subscribe errors are hidden after doing a subscribe all
const CDC_SUBSCRIBE_ERROR_HIDE_DURATION = 3000;

export default class StreamingMonitor extends LightningElement {
    @track channels;
    @track subscriptions = [];
    @track events = [];

    ignoreCdcSubscribeErrors = false;

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
    }

    disconnectedCallback() {
        this.handleUnsubscribeAll();
    }

    notify(variant, title, message) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleStreamingError(error) {
        const errorMessage =
            (error.subscription ? error.subscription + ' - ' : '') +
            (error.error
                ? error.error
                : "See browser's dev console for details");
        console.error('Streaming API error: ' + JSON.stringify(error));

        // Handle subscribe errors due to invalid channel (inactive CDC channels)
        if (
            error.channel === '/meta/subscribe' &&
            error.error &&
            error.error.indexOf('400::The channel specified is not valid') !==
                -1
        ) {
            const subChannel = error.subscription;
            const subIndex = this.subscriptions.findIndex(
                (s) => s.channel === subChannel
            );
            if (subIndex !== -1) {
                this.subscriptions.splice(subIndex, 1);
                console.warn(`Removing faulty subscription: ${subChannel}`);
            }
            if (!this.ignoreCdcSubscribeErrors && isCDCChannel(subChannel)) {
                this.notify(
                    'error',
                    'Streaming API error',
                    `Failed to subscribe to ${subChannel}. Is the CDC event active?`
                );
            }
        } else {
            // Notify error with a toast
            this.notify('error', 'Streaming API error', errorMessage);
        }
    }

    handleSubscribeAll(event) {
        console.log(`Subscribing to all streaming events`);
        const { replayId } = event.detail;

        // Build list of channels
        const channels = [];
        EVENT_TYPES.forEach((eventType) => {
            const eventTypeName = eventType.value;
            const channelPrefix = getChannelPrefix(eventTypeName);
            this.channels[eventTypeName].forEach((channelData) => {
                const channel = channelPrefix + channelData.value;
                if (
                    !this.subscriptions.some((sub) => sub.channel === channel)
                ) {
                    channels.push(channel);
                }
            });
        });
        // Disable CDC subscribtion errors since we may try inactive channels
        this.ignoreCdcSubscribeErrors = true;
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
            this.notify(
                'success',
                'Successfully subscribed to all channels',
                'Hold on for a sec as we remove CDC channels that are not enabled.'
            );
            // Re-enable CDC subscription errors after waiting a bit
            setTimeout(() => {
                this.ignoreCdcSubscribeErrors = false;
            }, CDC_SUBSCRIBE_ERROR_HIDE_DURATION);
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
        });
    }

    saveSubscription(subscription) {
        this.subscriptions.push(subscription);
        this.subscriptions.sort((a, b) => {
            const channelA = a.channel.toUpperCase();
            const channelB = b.channel.toUpperCase();
            if (channelA < channelB) {
                return -1;
            }
            if (channelA > channelB) {
                return 1;
            }
            return 0;
        });
    }

    handleStreamingEvent(streamingEvent) {
        this.notify('info', 'Received event', streamingEvent.channel);
        console.log(
            'Received streaming event: ',
            JSON.stringify(streamingEvent)
        );
        // Save event
        const eventData = normalizeEvent(streamingEvent);
        this.events.unshift(eventData);
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

    handleClearEvents() {
        this.events = [];
    }
}
