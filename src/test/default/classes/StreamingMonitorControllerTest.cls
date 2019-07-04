@isTest
public class StreamingMonitorControllerTest {
    
    static testMethod void publishStreamingEvent_should_fail_when_eventType_is_unsupported() {
        try {
            StreamingMonitorController.publishStreamingEvent(StreamingMonitorController.EVT_PUSH_TOPIC, 'name', '{}');
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException);
        }
    }
    
    static testMethod void publishPlatformEvent_should_fail_when_eventName_is_unknown_sObject() {
        try {
            StreamingMonitorController.publishPlatformEvent('unknown', '{}');
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException);
        }
    }

    static testMethod void publishPlatformEvent_should_fail_when_eventName_is_not_platform_event() {
        try {
            StreamingMonitorController.publishPlatformEvent('Account', '{}');
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException);
        }
    }

    static testMethod void publishPlatformEvent_should_fail_when_payload_is_invalid_json() {
        try {
            StreamingMonitorController.publishPlatformEvent('Account', 'invalid');
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException);
        }
    }

    static testMethod void publishGenericEvent_should_fail_when_invalid_eventName() {
        try {
            StreamingMonitorController.publishGenericEvent('unknown', '{}');
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof AuraHandledException);
        }
    }

    static testMethod void publishGenericEvent_should_work() {
        Test.setMock(HttpCalloutMock.class, new GenericEventPostMock(200));        
        insert new StreamingChannel(Name= '/u/TestSC');
        
        StreamingMonitorController.publishGenericEvent('TestSC', 'TestPayload');

        List<AsyncApexJob> jobs = [SELECT Status,NumberOfErrors FROM AsyncApexJob];
        System.assertEquals(1, jobs.size(), 'Expected an AsyncApexJob');
    }

    static testMethod void QueueableGenericEventPost_should_fail_when_rest_call_fails() {
        Test.setMock(HttpCalloutMock.class, new GenericEventPostMock(500));        
        StreamingMonitorController.QueueableGenericEventPost post = new StreamingMonitorController.QueueableGenericEventPost('/u/TestSC', 'TestPayload');

        try {
            post.execute(null);
            System.assert(false, 'Exception was expected');
        } catch (Exception e) {
            System.assert(e instanceof CalloutException);
        }
    }

    static testMethod void getAllEventChannels_should_work() {
        Map<String, List<StreamingMonitorController.ComboBoxItem>> channels = StreamingMonitorController.getAllEventChannels();
        System.assert(channels.size() > 0, 'Expected a list of channels');
    }

    static testMethod void getPushTopicEventChannels_should_work() {
        PushTopic pushTopic = new PushTopic();
        pushTopic.Name = 'TestPT';
        pushTopic.Query = 'SELECT Id, Name FROM Account';
        pushTopic.ApiVersion = 44.0;
        pushTopic.NotifyForOperationCreate = true;
        pushTopic.NotifyForOperationUpdate = true;
        pushTopic.NotifyForOperationUndelete = true;
        pushTopic.NotifyForOperationDelete = true;
        pushTopic.NotifyForFields = 'Referenced';
        insert pushTopic;

        List<StreamingMonitorController.ComboBoxItem> channels = StreamingMonitorController.getPushTopicEventChannels();
        System.assertEquals(1, channels.size());
        System.assertEquals('TestPT', channels.get(0).value);
    }

    static testMethod void getGenericEventChannels_should_work() {
        insert new StreamingChannel(Name= '/u/TestSC');
        List<StreamingMonitorController.ComboBoxItem> channels = StreamingMonitorController.getGenericEventChannels();
        System.assertEquals(1, channels.size());
        System.assertEquals('TestSC', channels.get(0).value);
    }
}
