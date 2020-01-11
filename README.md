# Streaming Monitor ([AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FYEEWUA5))

[![Github Workflow](https://github.com/pozil/streaming-monitor/workflows/CI/badge.svg?branch=master)](https://github.com/pozil/streaming-monitor/actions)

This Lightning App allows to monitor streaming events: PushTopic events, generic events, platform events, CDC events and monitoring events.

[Presentation Video](https://youtu.be/T9HT-TTCz2s)

Features:

-   Subscribe to all streaming events (event types are automatically discovered)
-   Subscribe to and unsubscribe from specific streaming events with a user-friendly UI
-   Publish an event (Generic events and platform events)
-   Register an event source (instructions and shortcuts)
-   Analyze past event content with flexible replay options

The app leverages the [lighnting-emp-api](https://developer.salesforce.com/docs/component-library/bundle/lightning-emp-api/documentation) Lightning Web Component for streaming event subscriptions.

<img src="gfx/event-monitor.png" alt="Streaming monitor screenshot"/>

## Installation

Get the Streaming Monitor from the [AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FYEEWUA5) or install it manually with the following procedure.

1. Install the app by running this script:

    **MacOS or Linux**

    ```
    ./install-dev.sh
    ```

    **Windows**

    ```
    install-dev.bat
    ```

2. Open the **Streaming Monitor** tab.
