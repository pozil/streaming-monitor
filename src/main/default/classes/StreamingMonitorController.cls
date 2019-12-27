/**
 * @File Name          : StreamingMonitorController.cls
 * @Description        :
 * @Author             : ChangeMeIn@UserSettingsUnder.SFDoc
 * @Group              :
 * @Last Modified By   : ChangeMeIn@UserSettingsUnder.SFDoc
 * @Last Modified On   : 26/12/2019 21:34:31
 * @Modification Log   :
 * Ver       Date            Author      		    Modification
 * 1.0    26/12/2019   ChangeMeIn@UserSettingsUnder.SFDoc     Initial Version
 **/
public abstract class StreamingMonitorController {
    public final static String EVT_PUSH_TOPIC = 'PushTopicEvent';
    public final static String EVT_GENERIC = 'GenericEvent';
    public final static String STD_EVT_PLATFORM_EVENT = 'StandardPlatformEvent';
    public final static String EVT_PLATFORM_EVENT = 'PlatformEvent';
    public final static String EVT_CDC_STANDARD = 'ChangeDataCaptureEvent';
    public final static String EVT_CDC_CUSTOM = 'CustomCDC';
    public final static String EVT_MONITORING = 'MonitoringEvent';

    @AuraEnabled
    public static void publishStreamingEvent(
        String eventType,
        String eventName,
        String eventPayload
    ) {
        if (
            eventType == EVT_PLATFORM_EVENT ||
            eventType == STD_EVT_PLATFORM_EVENT
        ) {
            publishPlatformEvent(eventName, eventPayload);
        } else if (eventType == EVT_GENERIC) {
            publishGenericEvent(eventName, eventPayload);
        } else {
            throw new AuraHandledException(
                'Unsupported event type: ' + eventType
            );
        }
    }

    @AuraEnabled
    public static Map<String, List<ComboBoxItem>> getAllEventChannels() {
        Map<String, List<ComboBoxItem>> channels = new Map<String, List<ComboBoxItem>>();
        channels.put(EVT_PUSH_TOPIC, getPushTopicEventChannels());
        channels.put(EVT_GENERIC, getGenericEventChannels());
        channels.put(
            STD_EVT_PLATFORM_EVENT,
            getStandardPlatformEventChannels()
        );
        channels.put(EVT_PLATFORM_EVENT, getPlatformEventChannels());
        channels.put(EVT_CDC_STANDARD, getChangeDataCaptureEventChannels());
        channels.put(EVT_CDC_CUSTOM, new List<ComboBoxItem>());
        channels.put(EVT_MONITORING, getEventMonitoringChannels());
        return channels;
    }

    @TestVisible
    private static void publishPlatformEvent(
        String eventName,
        String eventPayload
    ) {
        // Load event type
        Type platformEventType = Type.forName(null, eventName);
        if (platformEventType == null) {
            throw new AuraHandledException(
                'Unknown platform event type: ' + eventName
            );
        }
        // Create event instance
        SObject event;
        try {
            event = (SObject) JSON.deserialize(eventPayload, platformEventType);
        } catch (Exception e) {
            System.debug(e);
            System.debug(e.getCause());
            throw new AuraHandledException(
                'Failed to instantiate ' +
                eventName +
                ' platform event with provided data: ' +
                eventPayload
            );
        }
        // Publish event
        Database.SaveResult result = Eventbus.publish(event);
        if (!result.isSuccess()) {
            String errorMessage =
                'Failed to publish ' +
                eventName +
                ': EventBus publish error.';
            System.debug(errorMessage);
            for (Database.Error error : result.getErrors()) {
                System.debug(
                    'Error: ' +
                    error.getStatusCode() +
                    ' - ' +
                    error.getMessage() +
                    ' - ' +
                    error.getFields()
                );
            }
            throw new AuraHandledException(errorMessage);
        }
    }

    @TestVisible
    private static void publishGenericEvent(
        String eventName,
        String eventPayload
    ) {
        // Load event type
        String channel = '/u/' + eventName;
        List<StreamingChannel> channels = [
            SELECT Id
            FROM StreamingChannel
            WHERE Name = :channel
            LIMIT 1
        ];
        if (channels.size() != 1) {
            throw new AuraHandledException(
                'Unknown generic event type: ' + eventName
            );
        }
        // Posting event in a job in order to be able to call the REST API
        System.enqueueJob(
            new QueueableGenericEventPost(channels[0].Id, eventPayload)
        );
    }

    @TestVisible
    private static List<ComboBoxItem> getPushTopicEventChannels() {
        List<PushTopic> topics = [SELECT Name FROM PushTopic ORDER BY Name];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (PushTopic topic : topics) {
            items.add(new ComboBoxItem(topic.Name, topic.Name));
        }
        return items;
    }

    @TestVisible
    private static List<ComboBoxItem> getGenericEventChannels() {
        List<StreamingChannel> channels = [
            SELECT Name
            FROM StreamingChannel
            ORDER BY Name
        ];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (StreamingChannel channel : channels) {
            String name = channel.Name.substring(3);
            items.add(new ComboBoxItem(name, name));
        }
        return items;
    }

    @TestVisible
    private static List<ComboBoxItem> getChangeDataCaptureEventChannels() {
        List<EntityDefinition> entities = [
            SELECT Label, QualifiedApiName
            FROM EntityDefinition
            WHERE PublisherId = 'CDC'
            ORDER BY Label
        ];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (EntityDefinition entity : entities) {
            items.add(new ComboBoxItem(entity.Label, entity.QualifiedApiName));
        }
        return items;
    }

    @TestVisible
    private static List<ComboBoxItem> getPlatformEventChannels() {
        List<EntityDefinition> entities = [
            SELECT Label, QualifiedApiName, IsCustomizable
            FROM EntityDefinition
            WHERE IsCustomizable = true
            ORDER BY Label ASC
        ];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (EntityDefinition entity : entities) {
            if (entity.QualifiedApiName.endsWith('__e')) {
                items.add(
                    new ComboBoxItem(entity.Label, entity.QualifiedApiName)
                );
            }
        }
        return items;
    }

    @TestVisible
    private static List<ComboBoxItem> getStandardPlatformEventChannels() {
        List<EntityDefinition> entities = [
            SELECT Label, QualifiedApiName, IsCustomizable
            FROM EntityDefinition
            WHERE IsCustomizable = false 
            AND IsEverCreatable = true
            ORDER BY Label ASC
        ];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (EntityDefinition entity : entities) {
            if (
                entity.QualifiedApiName.endsWith('Event') &&
                !entity.QualifiedApiName.endsWith('ChangeEvent')
            ) {
                items.add(
                    new ComboBoxItem(entity.Label, entity.QualifiedApiName)
                );
            }
        }
        return items;
    }

    @TestVisible
    private static List<ComboBoxItem> getEventMonitoringChannels() {
        List<EntityDefinition> entities = [
            SELECT Label, QualifiedApiName
            FROM EntityDefinition
            WHERE QualifiedApiName LIKE '%EventStream'
            ORDER BY Label ASC
        ];
        List<ComboBoxItem> items = new List<ComboBoxItem>();
        for (EntityDefinition entity : entities) {
            items.add(new ComboBoxItem(entity.Label, entity.QualifiedApiName));
        }
        return items;
    }

    public class ComboBoxItem {
        @AuraEnabled
        public String label;

        @AuraEnabled
        public String value;

        public ComboBoxItem(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    @TestVisible
    private class QueueableGenericEventPost implements Queueable, Database.AllowsCallouts {
        private String channelId;
        private String payload;

        public QueueableGenericEventPost(String channelId, String payload) {
            this.channelId = channelId;
            this.payload = payload;
        }

        public void execute(QueueableContext context) {
            String restAPIURL =
                URL.getSalesforceBaseUrl().toExternalForm() +
                '/services/data/v47.0/sobjects/StreamingChannel/' +
                channelId +
                '/push';
            HttpRequest httpRequest = new HttpRequest();
            httpRequest.setMethod('POST');
            httpRequest.setHeader('Content-Type', 'application/json');
            httpRequest.setHeader(
                'Authorization',
                'Bearer ' + UserInfo.getSessionID()
            );
            httpRequest.setEndpoint(restAPIURL);
            httpRequest.setBody(
                '{ "pushEvents": [ { "payload": "' +
                payload +
                '", "userIds": [] } ] }'
            );
            Http http = new Http();
            HttpResponse httpResponse = http.send(httpRequest);
            if (httpResponse.getStatusCode() != 200) {
                System.debug(
                    'HTTP ' +
                    httpResponse.getStatusCode() +
                    ': ' +
                    httpResponse.getBody()
                );
                throw new CalloutException(httpResponse.getBody());
            }
        }
    }
}
