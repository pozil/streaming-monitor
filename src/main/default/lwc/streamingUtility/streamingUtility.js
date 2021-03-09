export const EVT_PUSH_TOPIC = 'PushTopicEvent';
export const EVT_GENERIC = 'GenericEvent';
export const EVT_STD_PLATFORM_EVENT = 'StandardPlatformEvent';
export const EVT_PLATFORM_EVENT = 'PlatformEvent';
export const EVT_CDC_STANDARD = 'ChangeDataCaptureEvent';
export const EVT_CDC_CUSTOM = 'CustomCDC';
export const EVT_MONITORING = 'MonitoringEvent';

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
        value: EVT_CDC_STANDARD,
        channelPrefix: '/data/'
    },
    {
        label: 'Change Data Capture channel',
        value: EVT_CDC_CUSTOM,
        channelPrefix: '/data/'
    },
    {
        label: 'Monitoring events',
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
 * Normalizes streaming event data for all supported streaming event types into this format: {id, time, channel, replayId, payload}
 * @param {object} event
 * @returns {object} normalized event data
 */
export function normalizeEvent(event) {
    // Build id for datatable
    let id = '';
    if (event.data.schema) {
        // Generic event does not support schema Id
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
        // UTC timestamp
        timestamp = time.getTime();
        // Adjust time to local timezone and format label
        const localTimestamp = timestamp - time.getTimezoneOffset() * 60000;
        timeLabel = new Date(localTimestamp)
            .toISOString()
            .replace(/z|t/gi, ' ');
        timeLabel = timeLabel.substr(0, timeLabel.length - 5);
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
        payload: JSON.stringify(payload)
    };
    return eventData;
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
