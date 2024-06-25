@isTest
public class StreamingMonitorControllerTest {
    @isTest
    static void publishStreamingEvent_fails_when_eventType_is_unsupported() {
        try {
            StreamingMonitorController.publishStreamingEvent(
                StreamingMonitorController.EVT_PUSH_TOPIC,
                'name',
                '{}'
            );
            Assert.fail('Exception was expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(
                e,
                StreamingMonitorController.StreamingException.class
            );
            assertContains(e.getMessage(), 'Unsupported event type');
        }
    }

    @isTest
    static void publishStreamingEvent_platformEvent_fails_when_eventName_is_unknown_sObject() {
        try {
            StreamingMonitorController.publishStreamingEvent(
                StreamingMonitorController.EVT_PLATFORM_EVENT,
                'mock',
                '{}'
            );
            Assert.fail('Exception was expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(
                e,
                StreamingMonitorController.StreamingException.class
            );
            assertContains(e.getMessage(), 'Unknown platform event type');
        }
    }

    @isTest
    static void publishStreamingEvent_platformEvent_fails_when_payload_is_invalid_json() {
        try {
            StreamingMonitorController.publishStreamingEvent(
                StreamingMonitorController.EVT_PLATFORM_EVENT,
                'Account',
                'invalid'
            );
            Assert.fail('Exception was expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(
                e,
                StreamingMonitorController.StreamingException.class
            );
            assertContains(e.getMessage(), 'Failed to instantiate');
        }
    }

    @isTest
    static void publishStreamingEvent_genericEvent_fails_when_invalid_eventName() {
        try {
            StreamingMonitorController.publishStreamingEvent(
                StreamingMonitorController.EVT_GENERIC,
                'unknown',
                '{}'
            );
            Assert.fail('Exception was expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(
                e,
                StreamingMonitorController.StreamingException.class
            );
            assertContains(e.getMessage(), 'Unknown generic event type');
        }
    }

    @isTest
    static void publishStreamingEvent_genericEvent_works() {
        Test.setMock(HttpCalloutMock.class, new GenericEventPostMock(200));
        insert new StreamingChannel(Name = '/u/TestSC');

        StreamingMonitorController.publishStreamingEvent(
            StreamingMonitorController.EVT_GENERIC,
            'TestSC',
            'TestPayload'
        );

        List<AsyncApexJob> jobs = [
            SELECT Status, NumberOfErrors
            FROM AsyncApexJob
        ];
        Assert.areEqual(1, jobs.size(), 'Expected an AsyncApexJob');
    }

    @isTest
    static void QueueableGenericEventPost_fails_when_rest_call_fails() {
        Test.setMock(HttpCalloutMock.class, new GenericEventPostMock(500));
        StreamingMonitorController.QueueableGenericEventPost post = new StreamingMonitorController.QueueableGenericEventPost(
            '/u/TestSC',
            'TestPayload'
        );

        try {
            post.execute(null);
            Assert.fail('Exception was expected');
        } catch (Exception e) {
            Assert.isInstanceOfType(e, CalloutException.class);
        }
    }

    @isTest
    static void getAllEventChannels_works() {
        Map<String, List<StreamingMonitorController.ComboBoxItem>> channels = StreamingMonitorController.getAllEventChannels();
        Assert.areEqual(
            8,
            channels.size(),
            'Expected a Map with 8 channel types'
        );
    }

    @isTest
    static void getPushTopicEventChannels_works() {
        PushTopic pushTopic = new PushTopic();
        pushTopic.Name = 'TestPT';
        pushTopic.Query = 'SELECT Id, Name FROM Account';
        pushTopic.ApiVersion = 60.0;
        pushTopic.NotifyForOperationCreate = true;
        pushTopic.NotifyForOperationUpdate = true;
        pushTopic.NotifyForOperationUndelete = true;
        pushTopic.NotifyForOperationDelete = true;
        pushTopic.NotifyForFields = 'Referenced';
        insert pushTopic;

        List<StreamingMonitorController.ComboBoxItem> channels = StreamingMonitorController.getPushTopicEventChannels();
        Assert.areEqual(1, channels.size());
        Assert.areEqual('TestPT', channels.get(0).value);
    }

    @isTest
    static void getGenericEventChannels_works() {
        insert new StreamingChannel(Name = '/u/TestSC');
        List<StreamingMonitorController.ComboBoxItem> channels = StreamingMonitorController.getGenericEventChannels();
        Assert.areEqual(1, channels.size());
        Assert.areEqual('TestSC', channels.get(0).value);
    }

    private static void assertContains(String actual, String expectedContent) {
        System.assert(
            actual?.contains(expectedContent),
            'Expected "' + actual + '" to contain "' + expectedContent + '"'
        );
    }
}
