# Streaming Monitor ([AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FYEEWUA5))

[![Github Workflow](<https://github.com/pozil/streaming-monitor/workflows/Salesforce%20DX%20CI%20(scratch%20org%20only)/badge.svg?branch=master>)](https://github.com/pozil/streaming-monitor/actions)

This Lightning App allows to monitor streaming events: PushTopic events, generic events, platform events, CDC events and monitoring events.

[Presentation Video](https://youtu.be/T9HT-TTCz2s)

Features:

-   Subscribe to all streaming events (event types are automatically discovered)
-   Subscribe to and unsubscribe from specific streaming events with a user-friendly UI
-   Publish an event (Generic events and platform events)
-   Register an event source (instructions and shortcuts)
-   Analyze past event content with flexible replay options

The app leverages the [lighnting:empApi](https://developer.salesforce.com/docs/component-library/bundle/lightning:empApi/documentation) service component for streaming event subscriptions.

<img src="gfx/event-monitor.png"/>

## Installation

Get the Streaming Monitor from the [AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FYEEWUA5) or install it manually with the following procedure.

### Unix

Execute the `install-dev.sh` bash script and open the **Streaming Monitor** tab.

### Other OS

Execute these Salesforce DX commands:

a) create a scratch org with a "streaming" alias:

```sh
sfdx force:org:create -s -f config/project-scratch-def.json -a streaming
```

b) push sources to the scratch org:

```sh
sfdx force:source:push -u streaming
```

c) assign permission set to the default user:

```sh
sfdx force:user:permset:assign -n Streaming_Monitor -u streaming
```

Open the **Streaming Monitor** tab.
