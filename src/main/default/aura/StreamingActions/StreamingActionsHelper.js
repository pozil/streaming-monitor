({
    updateChannel : function(component, pubSubPrefix) {
        const eventType = component.get('v.'+ pubSubPrefix +'EventType');
        const eventName = component.get('v.'+ pubSubPrefix +'EventName');
        const channelPrefix = this.getChannelPrefix(eventType);
        const channelComp = component.find(pubSubPrefix +'Channel');
        if (eventName === '') {
            channelComp.set('v.value', channelPrefix);
        } else {
            channelComp.set('v.value', channelPrefix + eventName);
        }
    },

    loadEvents : function(component, pubSubPrefix) {
        component.set('v.'+ pubSubPrefix +'EventName', '');
        this.updateChannel(component, pubSubPrefix);
        
        const eventType = component.get('v.'+ pubSubPrefix +'EventType');
        const channelDirectory = component.get('v.channels');
        if (pubSubPrefix === 'sub' && eventType === 'ChangeDataCaptureEvent') {
            channelDirectory[eventType].unshift({label: 'All Change Events', value: 'ChangeEvents'});
        }
        component.find(pubSubPrefix +'EventName').set('v.options', channelDirectory[eventType]);
    },

    getChannelPrefix : function(eventType) {
        switch (eventType) {
            case 'PushTopicEvent':
                return '/topic/';
            case 'GenericEvent':
                return '/u/';
            case 'PlatformEvent':
                return '/event/';
            case 'ChangeDataCaptureEvent':
                return '/data/';
        }
    },

    initReplayOptions : function(component, componentId) {
        const combobox = component.find(componentId);
        combobox.set('v.options', [
            {label: 'No replay', value: '-1'},
            {label: 'Replay past events', value: '-2'}
        ]);
        combobox.set('v.value', '-1');
    },

    getAllChannels : function(component) {
        const channelDirectory = component.get('v.channels');
        let prefix = this.getChannelPrefix('PushTopicEvent');
        let channels = channelDirectory.PushTopicEvent.map(channelInfo => (prefix + channelInfo.value));
        prefix = this.getChannelPrefix('GenericEvent');
        channels = channels.concat(channelDirectory.GenericEvent.map(channelInfo => (prefix + channelInfo.value)));
        prefix = this.getChannelPrefix('PlatformEvent');
        channels = channels.concat(channelDirectory.PlatformEvent.map(channelInfo => (prefix + channelInfo.value)));
        channels.push('/data/ChangeEvents');
        return channels;
    },

    fireMonitorEvent : function(action, params) {
        const monitorEvent = $A.get('e.c:StreamingMonitorEvent');
        monitorEvent.setParams({ action, params });
        monitorEvent.fire();
    },

    notify : function(component, type, message) {
        component.find('notifLib').showToast({
            variant: type,
            title: message
        });
    }
})
