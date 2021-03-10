/* eslint-disable no-console */
import { LightningElement, api } from 'lwc';
import {
    EVENT_TYPES,
    EVT_PUSH_TOPIC,
    EVT_GENERIC,
    EVT_STD_PLATFORM_EVENT,
    EVT_PLATFORM_EVENT,
    EVT_CDC_STANDARD,
    EVT_CDC_CUSTOM,
    EVT_MONITORING,
    getChannelPrefix
} from 'c/streamingUtility';

import subscribeAll from './subscribeAll.html';
import subscribe from './subscribe.html';
import publish from './publish.html';
import register from './register.html';

export default class Actions extends LightningElement {
    @api action = 'subscribeAll';
    @api channels = [];

    subAllReplay = '-1';

    subEventType;
    subEventName;
    subChannel;
    subReplay = '-1';

    pubEventType;
    pubEventName;
    pubChannel;
    pubPayload;

    regEventType;

    render() {
        switch (this.action) {
            case 'subscribeAll':
                return subscribeAll;
            case 'subscribe':
                return subscribe;
            case 'publish':
                return publish;
            case 'register':
                return register;
            default:
                throw new Error(`Unsupported action: ${this.action}`);
        }
    }

    handleSubscribeAll() {
        const subscribeEvent = new CustomEvent('subscribeall', {
            detail: {
                replayId: this.subReplay
            }
        });
        this.dispatchEvent(subscribeEvent);
    }

    handleSubscribe() {
        const subscribeEvent = new CustomEvent('subscribe', {
            detail: {
                channel: this.subChannel,
                replayId: this.subReplay
            }
        });
        this.dispatchEvent(subscribeEvent);
        this.subEventName = undefined;
        this.subChannel = '';
    }

    handlePublish() {
        const publishEvent = new CustomEvent('publish', {
            detail: {
                eventType: this.pubEventType,
                eventName: this.pubEventName,
                eventPayload: this.pubPayload
            }
        });
        this.dispatchEvent(publishEvent);
    }

    handleValueChange(event) {
        const { name } = event.target;
        this[name] = event.detail.value;
    }

    handleSubEventTypeChange(event) {
        this.subEventType = event.detail.value;
        this.subEventName = undefined;
        this.subChannel =
            this.subEventType === EVT_CDC_CUSTOM
                ? getChannelPrefix(EVT_CDC_CUSTOM)
                : '';
    }

    handleSubEventNameChange(event) {
        this.subEventName = event.detail.value;
        this.subChannel =
            getChannelPrefix(this.subEventType) + this.subEventName;
    }

    handlePubEventTypeChange(event) {
        this.pubEventType = event.detail.value;
        this.pubEventName = undefined;
        this.pubChannel = undefined;
        this.pubPayload = undefined;
    }

    handlePubEventNameChange(event) {
        this.pubEventName = event.detail.value;
        this.pubChannel =
            getChannelPrefix(this.pubEventType) + this.pubEventName;
    }

    handlePubPayloadChange(event) {
        const payloadElement = event.target;
        const { value } = event.detail;
        this.pubPayload = value;
        // Validate payload
        if (this.pubEventType === EVT_GENERIC) {
            payloadElement.setCustomValidity('');
        } else {
            try {
                if (value) {
                    JSON.parse(value);
                }
                payloadElement.setCustomValidity('');
            } catch (error) {
                payloadElement.setCustomValidity('Invalid JSON');
            }
        }
    }

    get subEventTypes() {
        return EVENT_TYPES;
    }

    get subEventNames() {
        if (!this.subEventType) {
            return [];
        }
        return this.channels[this.subEventType];
    }

    get subEventNamePlaceholder() {
        if (this.subEventType && this.channels[this.subEventType].length > 0) {
            return 'Select event';
        }
        if (!this.subEventType) {
            return 'Waiting for event type';
        }
        if (this.subEventType === EVT_CDC_CUSTOM) {
            return 'The /data/ChangeEvents channel and custom channels require manual channel input';
        }
        const eventDefinition = EVENT_TYPES.find(
            (e) => e.value === this.subEventType
        );
        if (!eventDefinition) {
            throw new Error(`Unsupported event type ${this.subEventType}`);
        }
        return `No ${eventDefinition.label}s available`;
    }

    get isSubEventNameDisabled() {
        return (
            this.subEventType === undefined ||
            this.channels[this.subEventType].length === 0
        );
    }

    get isSubChannelDisabled() {
        return this.subEventType !== EVT_CDC_CUSTOM;
    }

    get isSubscribeDisabled() {
        return (
            (this.subEventType === EVT_CDC_CUSTOM &&
                this.subChannel.trim() === '') ||
            (this.subEventType !== EVT_CDC_CUSTOM &&
                this.subEventName === undefined)
        );
    }

    get pubEventTypes() {
        return EVENT_TYPES;
    }

    get pubEventNames() {
        if (!this.pubEventType) {
            return [];
        }
        return this.channels[this.pubEventType];
    }

    get pubEventNamePlaceholder() {
        if (this.pubEventType && this.channels[this.pubEventType].length > 0) {
            return 'Select event';
        }
        if (!this.pubEventType) {
            return 'Waiting for event type';
        }
        const eventDefinition = EVENT_TYPES.find(
            (e) => e.value === this.pubEventType
        );
        if (!eventDefinition) {
            throw new Error(`Unsupported event type ${this.pubEventType}`);
        }
        return `No ${eventDefinition.label}s available`;
    }

    get isPubEventNameDisabled() {
        return (
            this.pubEventType === undefined ||
            this.channels[this.pubEventType].length === 0
        );
    }

    get isPublishDisabled() {
        return (
            this.pubEventType === undefined || this.pubEventName === undefined
        );
    }

    get isManualPublishedAllowed() {
        return (
            this.pubEventType === EVT_GENERIC ||
            this.pubEventType === EVT_PLATFORM_EVENT
        );
    }

    get regEventTypes() {
        return EVENT_TYPES;
    }

    get replayOptions() {
        return [
            { label: 'No replay', value: '-1' },
            { label: 'Replay past events', value: '-2' }
        ];
    }

    get isPushTopicReg() {
        return this.regEventType === EVT_PUSH_TOPIC;
    }

    get isGenericReg() {
        return this.regEventType === EVT_GENERIC;
    }

    get isPlatformEventReg() {
        return this.regEventType === EVT_PLATFORM_EVENT;
    }

    get isStandardPlatformEventReg() {
        return this.regEventType === EVT_STD_PLATFORM_EVENT;
    }

    get isStandardCDCReg() {
        return this.regEventType === EVT_CDC_STANDARD;
    }

    get isCustomCDCReg() {
        return this.regEventType === EVT_CDC_CUSTOM;
    }

    get isMonitoringReg() {
        return this.regEventType === EVT_MONITORING;
    }

    get isCDCSub() {
        return (
            this.subEventType === EVT_CDC_STANDARD ||
            this.subEventType === EVT_CDC_CUSTOM
        );
    }

    get isEventMonitoringSub() {
        return this.subEventType === EVT_MONITORING;
    }

    get pubPayloadHelp() {
        return this.pubEventType === EVT_GENERIC
            ? 'Plain string payload'
            : 'JSON formatted payload with strings delimited by double quotes';
    }
}
