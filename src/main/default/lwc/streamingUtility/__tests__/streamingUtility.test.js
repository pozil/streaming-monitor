import {
    EVENT_TYPES,
    EVT_PUSH_TOPIC,
    getChannelPrefix,
    isCDCChannel,
    normalizeEvent,
    getTimeLabel,
    channelSort,
    timestampSort
} from 'c/streamingUtility';

const MOCK_PUSH_TOPIC = require('./data/pushtopic.json');
const MOCK_GENERIC = require('./data/generic.json');
const MOCK_PLATFORM_EVENT = require('./data/platform-event.json');
const MOCK_CDC = require('./data/cdc.json');

describe('streamingUtility', () => {
    it('gets the channel prefix', () => {
        const topicPrefix = getChannelPrefix(EVT_PUSH_TOPIC);

        expect(topicPrefix).toBe(EVENT_TYPES[0].channelPrefix);
    });

    it('throws error when getting prefix for unknown event type', () => {
        expect(() => getChannelPrefix('unknown')).toThrow(
            'Unsupported event type unknown'
        );
    });

    it('detects if channel is CDC', () => {
        const isCdc = isCDCChannel('/data/something');
        expect(isCdc).toBeTruthy();
    });

    it('detects if channel is not CDC', () => {
        const isCdc = isCDCChannel('/event/something');
        expect(isCdc).toBeFalsy();
    });

    it('normalizes PushTopic event', () => {
        const normalized = normalizeEvent(MOCK_PUSH_TOPIC);

        expect(normalized.id).toBe(
            MOCK_PUSH_TOPIC.channel + MOCK_PUSH_TOPIC.data.event.replayId
        );
        expect(normalized.timestamp).toBe(
            new Date(MOCK_PUSH_TOPIC.data.event.createdDate).getTime()
        );
        expect(normalized.channel).toBe(MOCK_PUSH_TOPIC.channel);
        expect(normalized.replayId).toBe(MOCK_PUSH_TOPIC.data.event.replayId);
        expect(normalized.payload).toBe(
            JSON.stringify(MOCK_PUSH_TOPIC.data.sobject)
        );
    });

    it('normalizes generic event', () => {
        const normalized = normalizeEvent(MOCK_GENERIC);

        expect(normalized.id).toBe(
            MOCK_GENERIC.channel + MOCK_GENERIC.data.event.replayId
        );
        expect(normalized.timestamp).toBe(
            new Date(MOCK_GENERIC.data.event.createdDate).getTime()
        );
        expect(normalized.channel).toBe(MOCK_GENERIC.channel);
        expect(normalized.replayId).toBe(MOCK_GENERIC.data.event.replayId);
        expect(normalized.payload).toBe(
            JSON.stringify(MOCK_GENERIC.data.payload)
        );
    });

    it('normalizes platform event', () => {
        const normalized = normalizeEvent(MOCK_PLATFORM_EVENT);

        expect(normalized.id).toBe(
            MOCK_PLATFORM_EVENT.data.schema +
                MOCK_PLATFORM_EVENT.data.event.replayId
        );
        expect(normalized.timestamp).toBe(
            new Date(MOCK_PLATFORM_EVENT.data.payload.CreatedDate).getTime()
        );
        expect(normalized.channel).toBe(MOCK_PLATFORM_EVENT.channel);
        expect(normalized.replayId).toBe(
            MOCK_PLATFORM_EVENT.data.event.replayId
        );
        expect(normalized.payload).toBe(
            JSON.stringify(MOCK_PLATFORM_EVENT.data.payload)
        );
    });

    it('normalizes CDC event', () => {
        const normalized = normalizeEvent(MOCK_CDC);

        expect(normalized.id).toBe(
            MOCK_CDC.data.schema + MOCK_CDC.data.event.replayId
        );
        expect(normalized.timestamp).toBe(
            new Date(MOCK_CDC.data.payload.LastModifiedDate).getTime()
        );
        expect(normalized.channel).toBe(MOCK_CDC.channel);
        expect(normalized.replayId).toBe(MOCK_CDC.data.event.replayId);
        expect(normalized.payload).toBe(JSON.stringify(MOCK_CDC.data.payload));
    });

    it('gets the right time label', () => {
        const originalTime = new Date('2021-02-03T12:02:03Z');
        originalTime.getTimezoneOffset = () => -60;

        const label = getTimeLabel(originalTime);

        expect(label).toBe('2021-02-03 13:02:03');
    });

    it('sorts events by channels', () => {
        const events = [{ channel: 'B' }, { channel: 'c' }, { channel: 'a' }];

        const sorted = events.sort(channelSort);

        expect(sorted).toStrictEqual([
            { channel: 'a' },
            { channel: 'B' },
            { channel: 'c' }
        ]);
    });

    it('sorts events by timestamps', () => {
        const events = [{ timestamp: 3 }, { timestamp: 2 }, { timestamp: 1 }];

        const sorted = events.sort(timestampSort);

        expect(sorted).toStrictEqual([
            { timestamp: 1 },
            { timestamp: 2 },
            { timestamp: 3 }
        ]);
    });
});
