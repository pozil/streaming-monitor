# Streaming Playground

This Lightning page demonstrates the use of the [lighnting:empApi](https://developer.salesforce.com/docs/component-library/bundle/lightning:empApi/documentation) service component and pub/sub interactions with all streaming events (PushTopic events, generic events, platform events and CDC events).

## Installation

Execute these Salesforce DX commands:

a) create a scratch org with a "streaming" alias:
```sh
sfdx force:org:create -s -f config/project-scratch-def.json -a streaming
```

b) add dependency to server action service:
```sh
sfdx force:package:install --package 04t1t000000XfCt -w 10 -u streaming
```

c) push sources to scratch org:
```sh
sfdx force:source:push -u streaming
```

d) assign permission set to default user:
```sh
sfdx force:user:permset:assign -n Streaming_Playground -u streaming
```

Add the Streaming Playground tab to an existing or new Lightning app
