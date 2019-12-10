import { EVENT_TYPES, EVT_PUSH_TOPIC, getChannelPrefix } from 'c/streamingUtility';

describe('streamingUtility', () => {

    it('gets the right channel prefixes', () => {
        const topicPrefix = getChannelPrefix(EVT_PUSH_TOPIC);
        
        expect(topicPrefix).toBe(EVENT_TYPES[0].channelPrefix);
    });
});
