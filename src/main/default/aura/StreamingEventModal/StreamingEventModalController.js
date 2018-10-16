({
    onInit : function(component, event, helper) {
        const eventData = component.get('v.eventData');
        const payload = JSON.stringify(JSON.parse(eventData.payload), null, 4);
        component.find('payload').set('v.value', payload);
    }
})
