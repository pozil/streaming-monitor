export const EVT_PUSH_TOPIC = 'PushTopicEvent';
export const EVT_GENERIC = 'GenericEvent';
export const EVT_STD_PLATFORM_EVENT = 'StandardPlatformEvent';
export const EVT_PLATFORM_EVENT = 'PlatformEvent';
export const EVT_CDC = 'ChangeDataCaptureEvent';
export const EVT_CUSTOM_CHANNEL_CDC = 'CustomChannelCDC';
export const EVT_CUSTOM_CHANNEL_PE = 'CustomChannelPE';
export const EVT_MONITORING = 'MonitoringEvent';

export const FILTER_ALL = 'all';
export const FILTER_CUSTOM = 'custom';

export const CHANNEL_ALL_CDC = '/data/ChangeEvents';

export const EVENT_TYPES = [
    {
        label: 'PushTopic event',
        value: EVT_PUSH_TOPIC,
        channelPrefix: '/topic/'
    },
    {
        label: 'Generic event',
        value: EVT_GENERIC,
        channelPrefix: '/u/'
    },
    {
        label: 'Standard Platform event',
        value: EVT_STD_PLATFORM_EVENT,
        channelPrefix: '/event/'
    },
    {
        label: 'Custom Platform event',
        value: EVT_PLATFORM_EVENT,
        channelPrefix: '/event/'
    },
    {
        label: 'Change Data Capture event',
        value: EVT_CDC,
        channelPrefix: '/data/'
    },
    {
        label: 'Custom Channel - Platform event',
        value: EVT_CUSTOM_CHANNEL_PE,
        channelPrefix: '/event/'
    },
    {
        label: 'Custom Channel - Change event',
        value: EVT_CUSTOM_CHANNEL_CDC,
        channelPrefix: '/data/'
    },
    {
        label: 'Monitoring event',
        value: EVT_MONITORING,
        channelPrefix: '/event/'
    }
];

/**
 * Gets the channel prefix for a given streaming event type
 * @param {string} eventType - one of EVT_* constants
 * @returns {string} the channel prefix
 */
export function getChannelPrefix(eventType) {
    const eventDefinition = EVENT_TYPES.find((e) => e.value === eventType);
    if (!eventDefinition) {
        throw new Error(`Unsupported event type ${eventType}`);
    }
    return eventDefinition.channelPrefix;
}

/**
 * Tests whether a channel is for CDC (standard and custom channels)
 * @param {string} channel the channel path
 * @returns {boolean} true if channel is CDC else false
 */
export function isCDCChannel(channel) {
    return channel.startsWith('/data/');
}

/**
 * Tests whether a channel is custom
 * @param {string} eventTypeName
 * @param {string} channel
 * @returns {boolean} true if channel is custom else false
 */
export function isCustomChannel(eventTypeName, channel) {
    switch (eventTypeName) {
        case EVT_PUSH_TOPIC:
            return true;
        case EVT_GENERIC:
            return true;
        case EVT_STD_PLATFORM_EVENT:
            return false;
        case EVT_PLATFORM_EVENT:
            return channel.endsWith('__e');
        case EVT_CDC:
            return channel.endsWith('__ChangeEvent');
        case EVT_CUSTOM_CHANNEL_CDC:
            return true;
        case EVT_CUSTOM_CHANNEL_PE:
            return true;
        case EVT_MONITORING:
            return false;
        default:
            throw new Error(`Unsupported event type: ${eventTypeName}`);
    }
}

/**
 * Normalizes streaming event data for all supported streaming event types into this format: {id, time, channel, replayId, payload}
 * @param {object} event
 * @returns {object} normalized event data
 */
export function normalizeEvent(event) {
    // Build id for datatable
    let id = '';
    if (event.data.schema) {
        // Generic and PushTopic events do not support schema Id
        id = event.data.schema;
    } else {
        id = event.channel;
    }
    id += event.data.event.replayId;
    // Extract time from event
    let time,
        timeLabel,
        timestamp = null;
    if (event.data.event.createdDate) {
        // Generic event and PushTopic
        time = new Date(event.data.event.createdDate);
    } else if (event.data.payload.ChangeEventHeader) {
        // CDC
        time = new Date(event.data.payload.ChangeEventHeader.commitTimestamp);
    } else if (event.data.payload.CreatedDate) {
        // Platform Event
        time = new Date(event.data.payload.CreatedDate);
    }
    if (time) {
        timestamp = time.getTime();
        timeLabel = getTimeLabel(time);
    }
    // Get event type
    let type = null;
    if (event.data.event?.type) {
        type = `PushTopic: ${event.data.event.type}`;
    } else if (event.data.event.createdDate) {
        type = `Generic`;
    } else if (event.data.payload.ChangeEventHeader) {
        type = `Change Event: ${event.data.payload.ChangeEventHeader.entityName} ${event.data.payload.ChangeEventHeader.changeType}`;
    } else if (event.data.payload.CreatedDate) {
        type = 'Platform Event';
    }
    // Assemble payload
    let payload = null;
    if (event.data.payload) {
        payload = event.data.payload;
    } else if (event.data.sobject) {
        // PushTopic
        payload = event.data.sobject;
    }
    // Assemble normalized event data
    const eventData = {
        id,
        timestamp,
        timeLabel,
        channel: event.channel,
        replayId: event.data.event.replayId,
        type,
        payload: JSON.stringify(payload)
    };
    return eventData;
}

/**
 * Formats a UTC time and returns a label in local time
 * @param {Date} time
 */
export function getTimeLabel(time) {
    const localTimestamp = time.getTime() - time.getTimezoneOffset() * 60000;
    let timeLabel = new Date(localTimestamp)
        .toISOString()
        .replace(/z|t/gi, ' ');
    timeLabel = timeLabel.substr(0, timeLabel.length - 5);
    return timeLabel;
}

/**
 * Sorts items alphabetically based on the 'channel' property
 * @param {*} a
 * @param {*} b
 */
export function channelSort(a, b) {
    const valueA = a.channel.toUpperCase();
    const valueB = b.channel.toUpperCase();
    if (valueA < valueB) {
        return -1;
    }
    if (valueA > valueB) {
        return 1;
    }
    return 0;
}

/**
 * Sorts items based on the 'timestamp' property
 * @param {*} a
 * @param {*} b
 */
export function timestampSort(a, b) {
    const valueA = a.timestamp;
    const valueB = b.timestamp;
    if (valueA < valueB) {
        return -1;
    }
    if (valueA > valueB) {
        return 1;
    }
    return 0;
}

export function toTitleCase(original) {
    return original
        .replaceAll('_', ' ')
        .replace(
            /\w\S*/g,
            (word) =>
                word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
        );
}
