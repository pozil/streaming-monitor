export const EVT_PUSH_TOPIC = 'PushTopicEvent';
export const EVT_GENERIC = 'GenericEvent';
export const EVT_PLATFORM_EVENT = 'PlatformEvent';
export const EVT_CDC = 'ChangeDataCaptureEvent';

export const EVENT_TYPES = [
    {label: 'PushTopic event', value: EVT_PUSH_TOPIC, channelPrefix: '/topic/'},
    {label: 'Generic event', value: EVT_GENERIC, channelPrefix: '/u/'},    
    {label: 'Platform event', value: EVT_PLATFORM_EVENT, channelPrefix: '/event/'},
    {label: 'CDC event', value: EVT_CDC, channelPrefix: '/data/'}
];

/**
 * Gets the channel prefix for a given streaming event type
 * @param {string} eventType - one of EVT_* constants
 * @returns {string} the channel prefix
 */
export function getChannelPrefix(eventType) {
    const eventDefinition = EVENT_TYPES.find(e => e.value === eventType);
    if (!eventDefinition) {
        throw new Error(`Unsupported event type ${eventType}`);
    }
    return eventDefinition.channelPrefix;
}

const CDC_CHANNEL_REGEX = RegExp('^/data/[a-zA-Z0-9]*ChangeEvent$');

/**
 * Tests whether a channel is for CDC
 * @param {string} channel the channel path
 * @returns {boolean} true if channel is CDC else false
 */
export function isCDCChannel(channel) {
    return CDC_CHANNEL_REGEX.test(channel);
}

/**
 * Normalizes streaming event data for all supported streaming event types into this format: {id, time, channel, replayId, payload}
 * @param {object} event
 * @returns {object} normalized event data
 */
export function normalizeEvent(event) {
    // Build id for datatable
    let id = '';
    if (event.data.schema) { // Generic event does not support schema Id
        id = event.data.schema;
    } else {
        id = event.channel;
    }
    id += event.data.event.replayId;
    // Extract time from event
    let time = null;
    if (event.data.event.createdDate) { // Generic event and PushTopic
        time = new Date(event.data.event.createdDate);
    } else if (event.data.payload.ChangeEventHeader) { // CDC
        time = new Date(event.data.payload.ChangeEventHeader.commitTimestamp);
    } else if (event.data.payload.CreatedDate) { // Platform Event
        time = new Date(event.data.payload.CreatedDate);
    }
    if (time) {
        time = time.toISOString().replace(/z|t/gi,' ');
        time = time.substr(0, time.length -5);
    }
    // Assemble payload
    let payload = null;
    if (event.data.payload) {
        payload = event.data.payload;
    } else if (event.data.sobject) { // PushTopic
        payload = event.data.sobject;
    }
    // Assemble normalized event data
    const eventData = {
        id,
        time,
        channel: event.channel,
        replayId: event.data.event.replayId,
        payload: JSON.stringify(payload),
    };
    return eventData;
}
