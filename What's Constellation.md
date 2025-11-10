# State Management

A Data Application manages two distinct types of state: **OnChainState** and **CalculatedState**, each serving unique purposes in the metagraph architecture.

#### OnChain State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#onchain-state) <a href="#onchain-state" id="onchain-state"></a>

OnChainState contains all the information intended to be permanently stored on the blockchain. This state represents the immutable record of all updates that have been validated and accepted by the network.

It typically includes:

* A history of all data updates
* Transaction records
* Any data that requires blockchain-level immutability and auditability

OnChainState is replicated across all nodes in the network and becomes part of the chain's immutable record via inclusion in a snapshot. It should be designed to be compact and contain only essential information as it contributes to storage requirements and snapshot fees.

#### Calculated State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#calculated-state) <a href="#calculated-state" id="calculated-state"></a>

CalculatedState can be thought of as a metagraph's working memory, containing essential aggregated information derived from the complete chain of OnChainState. It is not stored on chain itself, but can be reconstructed by traversing the network's chain of snapshots and applying the `combine` function to them.

CalculatedState typically:

* Provides optimized data structures for querying
* Contains aggregated or processed information
* Stores derived data that can be reconstructed from OnChainState if needed

CalculatedState is maintained by each node independently and can be regenerated from the OnChainState if necessary. This makes it ideal for storing derived data, indexes, or sensitive information.

### Creating State Classes[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#creating-state-classes) <a href="#creating-state-classes" id="creating-state-classes"></a>

Each state described above represents functionality from the Data Application. To create these states, you need to implement custom traits provided by the Data Application:

* The OnChainState must extend the `DataOnChainState` trait
* The CalculatedState must extend the `DataCalculatedState` trait

Both traits, `DataOnChainState` and `DataCalculatedState`, can be found in the tessellation repository.

Here's a simple example of state definitions:

```
@derive(decoder, encoder)
case class VoteStateOnChain(updates: List[PollUpdate]) extends DataOnChainState

@derive(decoder, encoder)
case class VoteCalculatedState(polls: Map[String, Poll]) extends DataCalculatedState
```

### Updating State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#updating-state) <a href="#updating-state" id="updating-state"></a>

The DataAPI includes several lifecycle functions crucial for the proper functioning of the metagraph.

You can review all these functions in the [Lifecycle Functions](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/data/lifecycle-functions) section.

In this discussion, we'll focus on the following functions: `combine` and `setCalculatedState`

#### combine[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#combine) <a href="#combine" id="combine"></a>

Is the central function to updating the states. This function processes incoming requests/updates by either increasing or overwriting the existing states. Here is the function's signature:

```
override def combine(
  currentState: DataState[OnChainState, CalculatedState],
  updates: List[Signed[Update]]
): IO[DataState[OnChainState, CalculatedState]]
```

The combine function is invoked after the requests have been validated at both layers (l0 and l1) using the `validateUpdate` and `validateData` functions.

The `combine` function receives the `currentState` and the `updates`

* `currentState`: As indicated by the name, this is the current state of your metagraph since the last update was received.
* `updates`: This is the list of incoming updates. It may be empty if no updates have been provided to the current snapshot.

The output of this function is also a state, reflecting the new state of the metagraph post-update. Therefore, it's crucial to ensure that the function returns the correct updated state.

Returning to the `water and energy usage` example, you can review the implementation of the combine function [here](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/combiners/Combiners.scala). In this implementation, the function retrieves the current value of water or energy and then increments it based on the amount specified in the incoming request for the `CalculatedState`, while also using the current updates as the `OnChainState`.

#### setCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#setcalculatedstate) <a href="#setcalculatedstate" id="setcalculatedstate"></a>

Following the combine function and after the snapshot has been accepted and consensus reached, we obtain the `majority snapshot`. This becomes the official snapshot for the metagraph. At this point, we invoke the `setCalculatedState` function to update the `CalculatedState`.

This state is typically stored `in memory`, although user preferences may dictate alternative storage methods. You can explore the implementation of storing the `CalculatedState` in memory by checking the [CalculatedState.scala](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/calculated_state/CalculatedState.scala) and [CalculatedStateService.scala](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/calculated_state/CalculatedStateService.scala) classes, where we have detailed examples.

In the sections below, we will discuss `serializers` used to serialize the states.

### Serializers/Deserializers[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#serializersdeserializers) <a href="#serializersdeserializers" id="serializersdeserializers"></a>

We also utilize other lifecycle functions for `serialize/deserialize` processes, each designed specifically for different types of states.

For the `OnChainState`, we use the following functions:

```
def serializeState(
  state: OnChainState
): F[Array[Byte]]

def deserializeState(
  bytes: Array[Byte]
): F[Either[Throwable, OnChainState]]
```

For the `CalculatedState` we have:

```
def serializeCalculatedState(
  state: CalculatedState
): F[Array[Byte]] 

def deserializeCalculatedState(
  bytes: Array[Byte]
): F[Either[Throwable, CalculatedState]]
```

The `OnChainState` serializer is employed during the snapshot production phase, prior to consensus, when nodes propose snapshots to become the official one. Once the official snapshot is selected, based on the majority, the `CalculatedState` serializer is used to serialize this state and store the `CalculatedState` on disk.

The deserialization functions are invoked when constructing states from the `snapshots/calculatedStates` stored on disk. For instance, when restarting a metagraph, it's necessary to retrieve the state prior to the restart from the stored information on disk.

In the following section, we will provide a detailed explanation about disk storage.

### Disk Storage[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#disk-storage) <a href="#disk-storage" id="disk-storage"></a>

When operating a Metagraph on layer 0 (ml0), a directory named `data` is created. This directory is organized into the following subfolders:

* `incremental_snapshot`: Contains the Metagraph snapshots.
* `snapshot_info`: Stores information about the snapshots, including internal states like balances.
* `calculated_state`: Holds the Metagraph calculated state.

Focusing on the `calculated_state`, within this folder, files are named after the snapshot ordinal. These files contain the CalculatedState corresponding to that ordinal. We employ a logarithmic cutoff strategy to manage the storage of these states.

This folder is crucial when restarting the Metagraph. It functions as a `checkpoint`: instead of rerunning the entire chain to rebuild the `CalculatedState`, we utilize the files in the `calculated_state` directory. This method allows us to rebuild the state more efficiently, saving significant time.

### Data Privacy[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#data-privacy) <a href="#data-privacy" id="data-privacy"></a>

As previously mentioned, the `CalculatedState` serves a crucial role by allowing the storage of any type of information discreetly, without exposing it to the public. This functionality is particularly useful for safeguarding sensitive data. When you use the `CalculatedState`, you can access your information whenever necessary, but it remains shielded from being recorded on the blockchain.. This method offers an added layer of security, ensuring that sensitive data is not accessible or visible on the decentralized ledger.

By leveraging `CalculatedState`, organizations can manage proprietary or confidential information such as personal user data, trade secrets, or financial details securely within the metagraph architecture. The integrity and privacy of this data are maintained, as it is stored in a secure compartment separated from the public blockchain.

### Scalability[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#scalability) <a href="#scalability" id="scalability"></a>

Metagraphs face a constraint concerning the size of snapshots: `they must not exceed 500kb`. If snapshots surpass this threshold, they will be rejected, which can impose significant limitations on the amount of information that can be recorded on the blockchain.

This is where the CalculatedState becomesparticularly valuable. It allows for the storage of any amount of data, bypassing the size constraints of blockchain snapshots. Moreover, CalculatedState offers flexibility in terms of storage preferences,enabling users to choose how and where their data is stored.

This functionality not only alleviates the burden of blockchain size limitations but also enhances data management strategies. By utilizing CalculatedState, organizations can efficiently manage larger datasets, secure sensitive information off-chain, and optimize their blockchain resources for critical transactional data.

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/metagraph-framework/05-data/02-state-management.md)

# State Management

A Data Application manages two distinct types of state: **OnChainState** and **CalculatedState**, each serving unique purposes in the metagraph architecture.

#### OnChain State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#onchain-state) <a href="#onchain-state" id="onchain-state"></a>

OnChainState contains all the information intended to be permanently stored on the blockchain. This state represents the immutable record of all updates that have been validated and accepted by the network.

It typically includes:

* A history of all data updates
* Transaction records
* Any data that requires blockchain-level immutability and auditability

OnChainState is replicated across all nodes in the network and becomes part of the chain's immutable record via inclusion in a snapshot. It should be designed to be compact and contain only essential information as it contributes to storage requirements and snapshot fees.

#### Calculated State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#calculated-state) <a href="#calculated-state" id="calculated-state"></a>

CalculatedState can be thought of as a metagraph's working memory, containing essential aggregated information derived from the complete chain of OnChainState. It is not stored on chain itself, but can be reconstructed by traversing the network's chain of snapshots and applying the `combine` function to them.

CalculatedState typically:

* Provides optimized data structures for querying
* Contains aggregated or processed information
* Stores derived data that can be reconstructed from OnChainState if needed

CalculatedState is maintained by each node independently and can be regenerated from the OnChainState if necessary. This makes it ideal for storing derived data, indexes, or sensitive information.

### Creating State Classes[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#creating-state-classes) <a href="#creating-state-classes" id="creating-state-classes"></a>

Each state described above represents functionality from the Data Application. To create these states, you need to implement custom traits provided by the Data Application:

* The OnChainState must extend the `DataOnChainState` trait
* The CalculatedState must extend the `DataCalculatedState` trait

Both traits, `DataOnChainState` and `DataCalculatedState`, can be found in the tessellation repository.

Here's a simple example of state definitions:

```
@derive(decoder, encoder)
case class VoteStateOnChain(updates: List[PollUpdate]) extends DataOnChainState

@derive(decoder, encoder)
case class VoteCalculatedState(polls: Map[String, Poll]) extends DataCalculatedState
```

### Updating State[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#updating-state) <a href="#updating-state" id="updating-state"></a>

The DataAPI includes several lifecycle functions crucial for the proper functioning of the metagraph.

You can review all these functions in the [Lifecycle Functions](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/data/lifecycle-functions) section.

In this discussion, we'll focus on the following functions: `combine` and `setCalculatedState`

#### combine[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#combine) <a href="#combine" id="combine"></a>

Is the central function to updating the states. This function processes incoming requests/updates by either increasing or overwriting the existing states. Here is the function's signature:

```
override def combine(
  currentState: DataState[OnChainState, CalculatedState],
  updates: List[Signed[Update]]
): IO[DataState[OnChainState, CalculatedState]]
```

The combine function is invoked after the requests have been validated at both layers (l0 and l1) using the `validateUpdate` and `validateData` functions.

The `combine` function receives the `currentState` and the `updates`

* `currentState`: As indicated by the name, this is the current state of your metagraph since the last update was received.
* `updates`: This is the list of incoming updates. It may be empty if no updates have been provided to the current snapshot.

The output of this function is also a state, reflecting the new state of the metagraph post-update. Therefore, it's crucial to ensure that the function returns the correct updated state.

Returning to the `water and energy usage` example, you can review the implementation of the combine function [here](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/combiners/Combiners.scala). In this implementation, the function retrieves the current value of water or energy and then increments it based on the amount specified in the incoming request for the `CalculatedState`, while also using the current updates as the `OnChainState`.

#### setCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#setcalculatedstate) <a href="#setcalculatedstate" id="setcalculatedstate"></a>

Following the combine function and after the snapshot has been accepted and consensus reached, we obtain the `majority snapshot`. This becomes the official snapshot for the metagraph. At this point, we invoke the `setCalculatedState` function to update the `CalculatedState`.

This state is typically stored `in memory`, although user preferences may dictate alternative storage methods. You can explore the implementation of storing the `CalculatedState` in memory by checking the [CalculatedState.scala](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/calculated_state/CalculatedState.scala) and [CalculatedStateService.scala](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/water-and-energy-usage/modules/shared_data/src/main/scala/com/my/water_and_energy_usage/shared_data/calculated_state/CalculatedStateService.scala) classes, where we have detailed examples.

In the sections below, we will discuss `serializers` used to serialize the states.

### Serializers/Deserializers[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#serializersdeserializers) <a href="#serializersdeserializers" id="serializersdeserializers"></a>

We also utilize other lifecycle functions for `serialize/deserialize` processes, each designed specifically for different types of states.

For the `OnChainState`, we use the following functions:

```
def serializeState(
  state: OnChainState
): F[Array[Byte]]

def deserializeState(
  bytes: Array[Byte]
): F[Either[Throwable, OnChainState]]
```

For the `CalculatedState` we have:

```
def serializeCalculatedState(
  state: CalculatedState
): F[Array[Byte]] 

def deserializeCalculatedState(
  bytes: Array[Byte]
): F[Either[Throwable, CalculatedState]]
```

The `OnChainState` serializer is employed during the snapshot production phase, prior to consensus, when nodes propose snapshots to become the official one. Once the official snapshot is selected, based on the majority, the `CalculatedState` serializer is used to serialize this state and store the `CalculatedState` on disk.

The deserialization functions are invoked when constructing states from the `snapshots/calculatedStates` stored on disk. For instance, when restarting a metagraph, it's necessary to retrieve the state prior to the restart from the stored information on disk.

In the following section, we will provide a detailed explanation about disk storage.

### Disk Storage[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#disk-storage) <a href="#disk-storage" id="disk-storage"></a>

When operating a Metagraph on layer 0 (ml0), a directory named `data` is created. This directory is organized into the following subfolders:

* `incremental_snapshot`: Contains the Metagraph snapshots.
* `snapshot_info`: Stores information about the snapshots, including internal states like balances.
* `calculated_state`: Holds the Metagraph calculated state.

Focusing on the `calculated_state`, within this folder, files are named after the snapshot ordinal. These files contain the CalculatedState corresponding to that ordinal. We employ a logarithmic cutoff strategy to manage the storage of these states.

This folder is crucial when restarting the Metagraph. It functions as a `checkpoint`: instead of rerunning the entire chain to rebuild the `CalculatedState`, we utilize the files in the `calculated_state` directory. This method allows us to rebuild the state more efficiently, saving significant time.

### Data Privacy[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#data-privacy) <a href="#data-privacy" id="data-privacy"></a>

As previously mentioned, the `CalculatedState` serves a crucial role by allowing the storage of any type of information discreetly, without exposing it to the public. This functionality is particularly useful for safeguarding sensitive data. When you use the `CalculatedState`, you can access your information whenever necessary, but it remains shielded from being recorded on the blockchain.. This method offers an added layer of security, ensuring that sensitive data is not accessible or visible on the decentralized ledger.

By leveraging `CalculatedState`, organizations can manage proprietary or confidential information such as personal user data, trade secrets, or financial details securely within the metagraph architecture. The integrity and privacy of this data are maintained, as it is stored in a secure compartment separated from the public blockchain.

### Scalability[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management#scalability) <a href="#scalability" id="scalability"></a>

Metagraphs face a constraint concerning the size of snapshots: `they must not exceed 500kb`. If snapshots surpass this threshold, they will be rejected, which can impose significant limitations on the amount of information that can be recorded on the blockchain.

This is where the CalculatedState becomesparticularly valuable. It allows for the storage of any amount of data, bypassing the size constraints of blockchain snapshots. Moreover, CalculatedState offers flexibility in terms of storage preferences,enabling users to choose how and where their data is stored.

This functionality not only alleviates the burden of blockchain size limitations but also enhances data management strategies. By utilizing CalculatedState, organizations can efficiently manage larger datasets, secure sensitive information off-chain, and optimize their blockchain resources for critical transactional data.

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/metagraph-framework/05-data/02-state-management.md)



# Lifecycle functions

Lifecycle functions are essential to the design and operation of a metagraph within the Euclid SDK. These functions enable developers to hook into various stages of the framework's lifecycle, allowing for the customization and extension of the core functionality of their Data Application. By understanding and implementing these functions, developers can influence how data is processed, validated, and persisted, ultimately defining the behavior of their metagraph.

#### How Lifecycle Functions Fit into the Framework[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#how-lifecycle-functions-fit-into-the-framework) <a href="#how-lifecycle-functions-fit-into-the-framework" id="how-lifecycle-functions-fit-into-the-framework"></a>

In the Euclid SDK, lifecycle functions are organized within the L0 (DataApplicationL0Service), Currency L1 (CurrencyL1App), and Data L1 (DataApplicationL1Service) modules. These modules represent different layers of the metagraph architecture:

* **L0 Layer:** This is the base layer responsible for core operations like state management, validation, and consensus. Functions in this layer are critical for maintaining the integrity and consistency of the metagraph as they handle operations both before (`validateData`, `combine`) and after consensus (`setCalculatedState`).
* **Data L1 Layer:** This layer manages initial validations and data transformations through the /data endpoint. It is responsible for filtering and preparing data before it is sent to the L0 layer for further processing.
* **Currency L1 Layer:** This layer handles initial validations and transaction processing through the /transactions endpoint before passing data to the L0 layer. It plays a crucial role in ensuring that only valid and well-formed transactions are forwarded for final processing. Note that currency transactions are handled automatically by the framework and so only a small number of lifecycle events are available to customize currency transaction handling (`transactionValidator`, etc.).

By implementing lifecycle functions in these layers, developers can manage everything from the initialization of state in the `genesis` function to the final serialization of data blocks. Each function serves a specific purpose in the metagraph's lifecycle, whether it’s validating incoming data, updating states, or handling custom logic through routes and decoders.

#### Lifecycle Overview[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#lifecycle-overview) <a href="#lifecycle-overview" id="lifecycle-overview"></a>

The diagram below illustrates the flow of data within a metagraph, highlighting how transactions and data updates move from the Currency L1 and Data L1 layers into the L0 layer. The graphic also shows the sequence of lifecycle functions that are invoked at each stage of this process. By following this flow, developers can understand how their custom logic integrates with the framework and how data is processed, validated, and persisted as it progresses through the metagraph.

![Euclid SDK](https://docs.constellationnetwork.io/assets/images/data-update-lifecycle-3d44b4bc3815618d6cf3c83fa5f49313.png)

{% hint style="info" %}
Note that some lifecycle functions are called multiple times and across L1 and L0 layers. It is usually recommended to create a common, shared implementation for these functions.
{% endhint %}

### Functions[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#functions) <a href="#functions" id="functions"></a>

#### genesis[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#genesis) <a href="#genesis" id="genesis"></a>

Data Applications allow developers to define custom state schemas for their metagraph. Initial states are established in the `genesis` function within the `l0` module's `DataApplicationL0Service`. Use the `OnChainState` and `CalculatedState` methods to define the initial schema and content of the application `state` for the `genesis snapshot`.

For example, you can set up your initial states using map types, as illustrated in the Scala code below:

```
class OnChainState(updates: List[Update]) extends DataOnChainState
class CalculatedState(info: Map[String, String]) extends DataCalculatedState

override def genesis: DataState[OnChainState, CalculatedState] = DataState(OnChainState(List.empty), CalculatedState(Map.empty))
```

In the code above, we set the initial state to be:

* `OnChainState`: Empty list
* `CalculatedState`: Empty Map

#### signedDataEntityDecoder[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#signeddataentitydecoder) <a href="#signeddataentitydecoder" id="signeddataentitydecoder"></a>

This method parses custom requests at the `/data` endpoint into the `Signed[Update]` type. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers. By default, you can use the `circeEntityDecoder` to parse the JSON:

```
{
  "value": {
    // This type is defined by your application code
  },
  "proofs": [{
    "id": "<public key>",
    "signature": "<signature of data in value key above>"
  }]
}
```

The default implementation is straightforward:

```
def signedDataEntityDecoder[F[_] : Async: Env]: EntityDecoder[F, Signed[Update]] = circeEntityDecoder
```

For custom parsing of the request, refer to the example below:

```
  def signedDataEntityDecoder[F[_] : Async: Env]: EntityDecoder[F, Signed[Update]] = {
    EntityDecoder.decodeBy(MediaType.text.plain) { msg =>
    // Assuming msg.body is a comma-separated string of key-value pairs.
      val dataMap = msg.body.split(",").map { pair =>
        val Array(key, value) = pair.split(":")
        key.trim -> value.trim
      }.toMap

      val update = Update(dataMap.value)
      val hexId = Hex(dataMap.pubKey)
      val hexSignature = Hex(dataMap.signature)
      val signatureProof = SignatureProof(Id(hexId), Signature(hexSignature))
      val proofsSet = SortedSet(signatureProof)

      val proofs = NonEmptySet.fromSetUnsafe(proofsSet)
      Signed(update, proofs)
    }
  }
```

In this custom example, we parse a simple string formatted as a map, extracting the `value`, `pubKey`, and `signature` necessary to construct the `Signed[Update]`. This method allows for efficient handling of incoming data, converting it into a structured form ready for further processing.

#### validateUpdate[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#validateupdate) <a href="#validateupdate" id="validateupdate"></a>

This method validates the update on the L1 layer and can return synchronous errors through the `/data` API endpoint. Context information (oldState, etc.) is not available to this method so validations need to be based on the contents of the update only. Validations requiring context should be run in `validateData` instead. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, validate a field is within a positive range:

```
def validateUpdate(update: Update): IO[DataApplicationValidationErrorOr[Unit]] = IO {
  if (update.usage <= 0) {
    DataApplicationValidationError.invalidNec
  } else {
    ().validNec
  }
}
```

The code above rejects any update that has the update value less than or equal to 0.

#### validateData[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#validatedata) <a href="#validatedata" id="validatedata"></a>

This method runs on the L0 layer and validates an update (data) that has passed L1 validation and consensus. `validateData` has access to the old or current application state, and a list of updates. Validations that require access to state information should be run here. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, validate that a user has a balance before allowing an action:

```
def validateData(oldState: DataState[OnChainState, CalculatedState], updates: NonEmptyList[Signed[Update]]): IO[DataApplicationValidationErrorOr[Unit]] = IO {
  updates
    .map(_.value)
    .map {
      val currentBalance = acc.balances.getOrElse(update.address, 0)

      if (currentBalance > 0) {
        ().validNec 
      } else {
        DataApplicationValidationError.invalidNec
      }
    }
    .reduce
}
```

The code above rejects any update that the current balance is lower than 0.

#### combine[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#combine) <a href="#combine" id="combine"></a>

The `combine` method accepts the current state and a list of validated updates and should return the new state. This is where state is ultimately updated to generate the new snapshot state. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, subtract one from a balance map:

```
def combine(oldState: DataState[OnChainState, CalculatedState], updates: NonEmptyList[Signed[Update]]): IO[State] = IO {
  updates.foldLeft(oldState) { (acc, update) =>
    val currentBalance = acc.balances.getOrElse(update.address, 0)

    acc.focus(_.balances).modify(_.updated(update.address, currentBalance - 1))
  }
}
```

The code above will subtract one for the given address and update the state

#### serializeState and deserializeState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#serializestate-and-deserializestate) <a href="#serializestate-and-deserializestate" id="serializestate-and-deserializestate"></a>

These methods are required to convert the onChain state to and from byte arrays, used in the snapshot, and the OnChainState class defined in the genesis method. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, serialize to/from a State object:

```
  def serializeState(state: OnChainState): IO[Array[Byte]] = IO {
    state.asJson.deepDropNullValues.noSpaces.getBytes(StandardCharsets.UTF_8)
  }

  def deserializeState(bytes: Array[Byte]): IO[Either[Throwable, OnChainState]] = IO {
    parser.parse(new String(bytes, StandardCharsets.UTF_8)).flatMap { json =>
      json.as[OnChainState]
    }
  }
```

The codes above serialize and deserialize using `Json`

#### serializeCalculatedState and deserializeCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#serializecalculatedstate-and-deserializecalculatedstate) <a href="#serializecalculatedstate-and-deserializecalculatedstate" id="serializecalculatedstate-and-deserializecalculatedstate"></a>

These methods are essential for converting the CalculatedState to and from byte arrays. Although the `CalculatedState` does not go into the snapshot, it is stored in the `calculated_state` directory under the `data` directory. For more details, refer to the [State Management](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management) section. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, serialize to/from a State object:

```
  def serializeCalculatedState(state: CalculatedState): IO[Array[Byte]] = IO {
    state.asJson.deepDropNullValues.noSpaces.getBytes(StandardCharsets.UTF_8)
  }

  def deserializeCalculatedState(bytes: Array[Byte]): IO[Either[Throwable, CalculatedState]] = IO {
    parser.parse(new String(bytes, StandardCharsets.UTF_8)).flatMap { json =>
      json.as[CalculatedState]
    }
  }
```

The codes above serialize and deserialize using `Json`

#### serializeUpdate and deserializeUpdate[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#serializeupdate-and-deserializeupdate) <a href="#serializeupdate-and-deserializeupdate" id="serializeupdate-and-deserializeupdate"></a>

These methods are required to convert updates sent to the `/data` endpoint to and from byte arrays. Signatures are checked against the byte value of the `value` key of the update so these methods give the option to introduce custom logic for how data is signed by the client. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, serialize to/from a JSON update:

```
  def serializeUpdate(update: Update): IO[Array[Byte]] = IO {
    update.asJson.deepDropNullValues.noSpaces.getBytes(StandardCharsets.UTF_8)
  }

  def deserializeUpdate(bytes: Array[Byte]): IO[Either[Throwable, Update]] = IO {
    parser.parse(new String(bytes, StandardCharsets.UTF_8)).flatMap { json =>
      json.as[Update]
    }
  }
```

The codes above serialize and deserialize using `Json`

#### serializeBlock and deserializeBlock[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#serializeblock-and-deserializeblock) <a href="#serializeblock-and-deserializeblock" id="serializeblock-and-deserializeblock"></a>

These methods are required to convert the data application blocks to and from byte arrays, used in the snapshot.\
It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

For example, serialize to/from a State object:

```
  def serializeBlock(block: Signed[DataApplicationBlock]): IO[Array[Byte]] = IO {
    state.asJson.deepDropNullValues.noSpaces.getBytes(StandardCharsets.UTF_8)
  }

  def deserializeBlock(bytes: Array[Byte]): IO[Either[Throwable, Signed[DataApplicationBlock]]] = IO {
    parser.parse(new String(bytes, StandardCharsets.UTF_8)).flatMap { json =>
      json.as[Signed[DataApplicationBlock]]
    }
  }
```

The codes above serialize and deserialize using `Json`

#### setCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#setcalculatedstate) <a href="#setcalculatedstate" id="setcalculatedstate"></a>

This function updates the `calculatedState`. For details on when and why this function is called, refer to the [State Management](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/state-management) section. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

```
  override def setCalculatedState(
    ordinal: SnapshotOrdinal,
    state  : CalculatedState
  )(implicit context: L0NodeContext[IO]): IO[Boolean] = {
      val currentCalculatedState = currentState.state
      val updated = state.devices.foldLeft(currentCalculatedState.devices) {
        case (acc, (address, value)) =>
          acc.updated(address, value)
      }

      CalculatedState(snapshotOrdinal, CalculatedState(updated))
    }.as(true)
        
```

The code above simply replaces the current address with the new value, thereby overwriting it.

#### getCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#getcalculatedstate) <a href="#getcalculatedstate" id="getcalculatedstate"></a>

This function retrieves the `calculatedState`. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

```
  override def getCalculatedState(implicit context: L0NodeContext[IO]): IO[(SnapshotOrdinal, CheckInDataCalculatedState)] = 
  currentState.state.map(calculatedState => (calculatedState.ordinal, calculatedState.state))
        
```

The code above is an example of how to implement the retrieval of `calculatedState`.

#### hashCalculatedState[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#hashcalculatedstate) <a href="#hashcalculatedstate" id="hashcalculatedstate"></a>

This function hashes the `calculatedState`, which is used for `proofs`. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

```
  override def hashCalculatedState(
    state: CalculatedState
  )(implicit context: L0NodeContext[IO]): IO[Hash] = {
    val jsonState = state.asJson.deepDropNullValues.noSpaces
    Hash.fromBytes(jsonState.getBytes(StandardCharsets.UTF_8))
  }
        
```

The code above is an example of how to implement the hashing of `calculatedState`.

#### dataEncoder and dataDecoder[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#dataencoder-and-datadecoder) <a href="#dataencoder-and-datadecoder" id="dataencoder-and-datadecoder"></a>

Custom encoders/decoders for the updates. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

```
def dataEncoder: Encoder[Update] = deriveEncoder
def dataDecoder: Decoder[Update] = deriveDecoder
```

The code above uses the `circe` semiauto deriveEncoder and deriveDecoder

#### calculatedStateEncoder and calculatedStateDecoder[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/data/lifecycle-functions#calculatedstateencoder-and-calculatedstatedecoder) <a href="#calculatedstateencoder-and-calculatedstatedecoder" id="calculatedstateencoder-and-calculatedstatedecoder"></a>

Custom encoders/decoders for the calculatedStates. It should be implemented in both `Main.scala` files for the `l0` and `data-l1` layers

```
def calculatedStateEncoder: Encoder[CalculatedState] = deriveEncoder
def calculatedStateDecoder: Decoder[CalculatedState] = deriveDecoder
```

The code above uses the `circe` semiauto deriveEncoder and deriveDecoder

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/metagraph-framework/05-data/03-lifecycle-functions.md)


# Framework Endpoints

A metagraph functions similarly to a traditional back-end server, interacting with the external world through HTTP endpoints with specific read (GET) and write (POST) functionalities. While a metagraph is decentralized by default and backed by an on-chain data store, it operates much like any other web server. This section outlines the default endpoints available to developers to interact with their metagraph.

See also [Custom Queries](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/custom-endpoints) for information on how to create your own metagraph endpoints.

### Endpoints[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/framework-endpoints#framework-endpoints) <a href="#framework-endpoints" id="framework-endpoints"></a>

Below is a list of available endpoints made available by default through the Metagraph Framework. Each endpoint is hosted by a node running either the Metagraph L0, Currency L1, or Data L1.

This is not an exhaustive list of available endpoints, please see [Metagraph APIs](https://app.gitbook.com/s/lzDyHxpeesNyOR3WIEd4/metagraph-apis) for more information and links to the OpenAPI specifications of each API.

#### Universally Available Endpoints[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/framework-endpoints#universally-available-endpoints) <a href="#universally-available-endpoints" id="universally-available-endpoints"></a>

These endpoints are available on all (mL0, cL1, and dL1) APIs and are useful for debugging and monitoring purposes.

| Method | Endpoint      | Description                                                                                                                                                                                                        |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | /node/info    | Returns info about the health and connectivity state of a particular node. This is useful for understanding if a node is connected to its layer of the network and its ready state.                                |
| GET    | /cluster/info | Returns info about the cluster of nodes connected to the node's layer of the network. This is useful for understanding how many nodes are connected at each layer and diagnosing issues related to cluster health. |

#### Metagraph L0[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/framework-endpoints#metagraph-l0) <a href="#metagraph-l0" id="metagraph-l0"></a>

Endpoints available on metagraph L0 nodes.

| Method | Endpoint                   | Description                                                                                                                                                                                                                                                 |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /snapshots/latest          | Returns the latest incremental snapshot created by the metagraph. Incremental snapshots contain only changes since the previous snapshot. This endpoint also supports returning snapshots at specific ordinals with the format \`GET /snapshots/:ordinal\`. |
| GET    | /snapshots/latest/combined | Returns the latest full snapshot of the metagraph which includes some calculated values. This shows the complete state of the metagraph at that moment in time.                                                                                             |
| GET    | /currency/:address/balance | Returns the balance of a particular address on the metagraph at the current snapshot.                                                                                                                                                                       |
| GET    | /currency/total-supply     | Returns the total number of tokens in circulation at the current snapshot. Note that "total supply" in this case is total supply created currently. It doesn't represent max supply of the token.                                                           |

#### Currency L1[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/framework-endpoints#currency-l1) <a href="#currency-l1" id="currency-l1"></a>

Endpoints available on currency L1 nodes.

| Method | Endpoint                              | Description                                                                                                                                                 |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /transactions                         | Accepts signed L0 token transactions.                                                                                                                       |
| GET    | /transactions/:hash                   | Returns a single transaction by hash if the transaction is in the node's mempool waiting to be processed. Does not have access to non-pending transactions. |
| GET    | /transactions/last-reference/:address | Returns the lastRef value for the provided address. LastRef is necessary for constructing a new transaction.                                                |
| POST   | /estimate-fee                         | Returns the minimum fee required give the (unsigned) currency transaction.                                                                                  |

#### Data L1[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/framework-endpoints#data-l1) <a href="#data-l1" id="data-l1"></a>

| Method | Endpoint           | Description                                                                                                   |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| POST   | /data              | Accepts custom-defined data updates.                                                                          |
| GET    | /data              | Returns all data updates in mempool waiting to be processed.                                                  |
| POST   | /data/estimate-fee | (v2.9.0+) Returns the minimum fee and destination address to process the given (unsigned) custom data update. |


# Custom Endpoints

Metagraph developers have the ability to define their own endpoints to add additional functionality to their applications. Custom endpoints are supported on each of the layers, with different contextual data and scalability considerations for each. These endpoints can be used to provide custom views into snapshot state, or for any custom handling that the developer wishes to include as part of the application.

### Defining a Route[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/custom-endpoints#defining-a-route) <a href="#defining-a-route" id="defining-a-route"></a>

A route can be defined by overriding the `routes` function available on `DataApplicationL0Service` or `DataApplicationL1Service`, creating endpoints on the metagraph L0 node or data L1 node, respectively. Custom routes are defined as instances of http4s `HttpRoutes`.

Here is a minimal example that shows how to return a map of currency addresses with a balance on the metagraph. The example accesses the `addresses` property of L0 chain context and returns it to the requester.

```
  // modules/l0/.../l0/Main.scala

  override def routes(implicit context: L0NodeContext[IO]): HttpRoutes[IO] = HttpRoutes.of {
    case GET -> Root / "addresses" =>
      OptionT(context.getLastCurrencySnapshot)
        .flatMap(_.dataApplication.toOptionT)
        .flatMapF(da => deserializeState(da.onChainState).map(_.toOption))
        .value
        .flatMap {
          case Some(value) => Ok(value.addresses)
          case None => NotFound()
        }
  }
```

For a slightly more complex example, the code below shows how to return the Data Application's calculated state from an endpoint. It also shows a more common pattern for route definition which moves route definitions to their own file, defined as a case class extending `Http4sDsl[F]`. Note that `calculatedStateService` is not available as part of `L0NodeContext` so it must be passed to the case class.

```
  // modules/l0/.../l0/Main.scala
  override def routes(implicit context: L0NodeContext[IO]): HttpRoutes[IO] = CustomRoutes[IO](calculatedStateService).public

  // modules/l0/.../l0/CustomRoutes.scala
  case class CustomRoutes[F[_] : Async](calculatedStateService: CalculatedStateService[F]) extends Http4sDsl[F] with PublicRoutes[F] {
    @derive(encoder, decoder)
    case class CalculatedStateResponse(
      ordinal        : Long,
      calculatedState: CheckInDataCalculatedState
    )

    private def getLatestCalculatedState: F[Response[F]] = {
      calculatedStateService.getCalculatedState
        .map(state => CalculatedStateResponse(state.ordinal.value.value, state.state))
        .flatMap(Ok(_))
    }

    private val routes: HttpRoutes[F] = HttpRoutes.of[F] {
      case GET -> Root / "calculated-state" / "latest" => getLatestCalculatedState
    }

    val public: HttpRoutes[F] =
      CORS
        .policy
        .withAllowCredentials(false)
        .httpRoutes(routes)

    override protected def prefixPath: InternalUrlPrefix = "/"
  }
```

#### Custom Route Prefix[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/custom-endpoints#custom-route-prefix) <a href="#custom-route-prefix" id="custom-route-prefix"></a>

All custom defined routes exist under a prefix, shown in the example above as `Root`. By default this prefix is `/data-application`, so for example you might define an `addresses` route which would be found at `http://<base-url>:port/data-application/addresses`.

It is possible to override the default prefix to provide your own custom prefix by overriding the `routesPrefix` method.

For example, to use the prefix "/d" instead of "/data-application":

```
  override def routesPrefix: ExternalUrlPrefix = "/d"
```

### Examples[​](https://docs.constellationnetwork.io/sdk/metagraph-framework/custom-endpoints#examples) <a href="#examples" id="examples"></a>

For more complete examples of custom route implementations, see [Example Codebases](https://docs.constellationnetwork.io/metagraph-development/resources/example-codebases).


# Quick Start

## Quick Start Guide

This guide will walk you through the process of setting up a minimal development environment using the Euclid Development Environment project, installing the Metagraph Framework, and launching clusters. The process should take less than an hour, including installing dependencies.

{% hint style="info" %}
**Windows Support**

Primary development focus for this SDK is based on UNIX-based operating systems like macOS or Linux. With that being said, Windows support is available using the Windows Subsystem for Linux (WSL) to emulate a UNIX environment. The following guide has been tested in that environment and works wells.

See [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install) for more detail in setting up WSL on your Windows machine.
{% endhint %}

## Install Dependencies[​](https://docs.constellationnetwork.io/sdk/guides/quick-start#install-dependencies) <a href="#install-dependencies" id="install-dependencies"></a>

**Install Basic Dependencies**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#install-basic-dependencies)

Many developers can skip this step because these dependencies are already installed.

* [Node JS](https://nodejs.org/en)
* [Yarn](https://classic.yarnpkg.com/en/docs/install)
* [Docker](https://docs.docker.com/get-docker/)
* [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)
* [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
* [Scala 2.13](https://www.scala-lang.org/download/)
* [Jq](https://jqlang.github.io/jq/download/)
* [Yq](https://github.com/mikefarah/yq)

**Install argc**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#install-argc)

```sh
cargo install argc
```

**Install Giter**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#install-giter)

```sh
cs install giter8
```

**Configure Docker**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#configure-docker)

The Euclid Development Environment starts up to 10 individual docker containers to create a minimal development environment which takes some significant system resources. Configure docker to make at least 8GB of RAM available. If you are using Docker Desktop, this setting can be found under Preferences -> Resources.

## Install[​](https://docs.constellationnetwork.io/sdk/guides/quick-start#install) <a href="#install" id="install"></a>

**Clone**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#clone)

Clone the Euclid Development Environment project to your local machine.

```sh
git clone https://github.com/Constellation-Labs/euclid-development-environment
cd euclid-development-environment
```

See the [Development Environment](https://docs.constellationnetwork.io/metagraph-development/elements/development-environment) section for an overview of the directory structure of the project.

**Configure**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#configure)

Update the `project_name` field to the name of your project.

**Hydra**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#hydra)

Familiarize yourself with the `hydra` CLI. We can use the `hydra` CLI tool to build the necessary docker containers and manage our network clusters.

```sh
scripts/hydra -h

USAGE: hydra <COMMAND>

COMMANDS:
  install                           Installs a local framework and detaches project
  install-template                  Installs a project from templates
  build                             Build containers
  start-genesis                     Start containers from the genesis snapshot (erasing history) [aliases: start_genesis]
  start-rollback                    Start containers from the last snapshot (maintaining history) [aliases: start_rollback]
  stop                              Stop containers
  destroy                           Destroy containers
  purge                             Destroy containers and images
  status                            Check the status of the containers
  remote-deploy                     Remotely deploy to cloud instances using Ansible [aliases: remote_deploy]
  remote-start                      Remotely start the metagraph on cloud instances using Ansible [aliases: remote_start]
  remote-status                     Check the status of the remote nodes
  update                            Update Euclid
  logs                              Get the logs from containers
  install-monitoring-service        Download the metagraph-monitoring-service (https://github.com/Constellation-Labs/metagraph-monitoring-service) [aliases: install_monitoring_service]
  remote-deploy-monitoring-service  Deploy the metagraph-monitoring-service to remote host [aliases: remote_deploy_monitoring_service]
  remote-start-monitoring-service   Start the metagraph-monitoring-service on remote host [aliases: remote_start_monitoring_service]
```

**Install Project**[**​**](https://docs.constellationnetwork.io/sdk/guides/quick-start#install-project)

Running the `install` command will do two things:

* Creates currency-l0 and currency-l1 projects from a g8 template and moves them to the `source/project` directory.
* Detach your project from the source repo.

Detaching your project from the source repo removes its remote git configuration and prepares your project to be included in your own version control. Once detached, your project can be updated with `hydra`.

```sh
scripts/hydra install   
```

You can import a metagraph template from custom examples by using the following command:

```sh
scripts/hydra install-template
```

By default, we use the [Metagraph Examples](https://github.com/Constellation-Labs/metagraph-examples) repository. You should provide the template name when running this command. To list the templates available to install, type:

```sh
scripts/hydra install-template --list
```

## Build[​](https://docs.constellationnetwork.io/sdk/guides/quick-start#build) <a href="#build" id="build"></a>

Build your network clusters with hydra. By default, this builds `metagraph-ubuntu`, `metagraph-base-image`, and `prometheus` + `grafana` monitoring containers. These images will allow deploy the containers with metagraph layers: `global-l0`, `metagraph-l0`, `currency-l1`, and `data-l1`. The `dag-l1` layer is not built by default since it isn't strictly necessary for metagraph development. You can include it on the `euclid.json` file.

Start the build process. This can take a significant amount of time... be patient.

```sh
scripts/hydra build
```

## Run[​](https://docs.constellationnetwork.io/sdk/guides/quick-start#run) <a href="#run" id="run"></a>

After your containers are built, go ahead and start them with the `start-genesis` command. This starts all network components from a fresh genesis snapshot.

```sh
scripts/hydra start-genesis
```

Once the process is complete you should see output like this:

```sh
################################################################
######################### METAGRAPH INFO #########################

Metagraph ID: :your_id


Container metagraph-node-1 URLs
Global L0: http://localhost:9000/node/info
Metagraph L0: http://localhost:9200/node/info
Currency L1: http://localhost:9300/node/info
Data L1: http://localhost:9400/node/info


Container metagraph-node-2 URLs
Metagraph L0: http://localhost:9210/node/info
Currency L1: http://localhost:9310/node/info
Data L1: http://localhost:9410/node/info


Container metagraph-node-3 URLs
Metagraph L0: http://localhost:9220/node/info
Currency L1: http://localhost:9320/node/info
Data L1: http://localhost:9420/node/info


Clusters URLs
Global L0: http://localhost:9000/cluster/info
Metagraph L0: http://localhost:9200/cluster/info
Currency L1: http://localhost:9300/cluster/info
Data L1: http://localhost:9400/cluster/info

####################################################################
```

You can also check the status of your containers with the `status` command.

```sh
scripts/hydra status
```

## Next Steps[​](https://docs.constellationnetwork.io/sdk/guides/quick-start#next-steps) <a href="#next-steps" id="next-steps"></a>

You now have a minimal development environment installed and running 🎉

<table data-card-size="large" data-view="cards"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><strong>Send your first transaction</strong></td><td>Set up the FE Developer Dashboard and send your hello world metagraph transaction.</td></tr><tr><td><strong>Manual Setup</strong></td><td>Prefer to configure your environment by hand? Explore manual setup.</td></tr></tbody></table>
# Send a Transaction

In this guide, we will explore two of the tools that work together with the Euclid Developer Environment, then use them to send and track our first metagraph token transaction.

We will install the [Developer Dashboard](https://docs.constellationnetwork.io/metagraph-development/elements/telemetry-dashboard), send a transaction using an included script, and monitor our clusters using the [Telemetry Dashboard](https://docs.constellationnetwork.io/sdk/elements/telemetry-dashboard).

### Before You Start[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#before-you-start) <a href="#before-you-start" id="before-you-start"></a>

This guide assumes that you have configured your local environment based on the [Quick Start Guide](https://docs.constellationnetwork.io/metagraph-development/guides/quick-start) and have at least your `global-l0`, `currency-l0`, `currency-l1`, and `monitoring` clusters running.

### Install the SDK Developer Dashboard[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#install-the-sdk-developer-dashboard) <a href="#install-the-sdk-developer-dashboard" id="install-the-sdk-developer-dashboard"></a>

The Developer Dashboard is a frontend dashboard built with NextJS and Tailwind CSS. It comes with default configuration to work with the Development Environment on install.

### Setup Guide[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#setup-guide) <a href="#setup-guide" id="setup-guide"></a>

#### Prerequisites[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#prerequisites) <a href="#prerequisites" id="prerequisites"></a>

* Node.js (`v16` recommended)
* `npm` or `yarn` package manager

#### Installation[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#installation) <a href="#installation" id="installation"></a>

1. Clone the repository

   ```
   git clone https://github.com/Constellation-Labs/sdk-developer-dashboard.git
   cd sdk-developer-dashboard
   ```
2. Install dependencies

   ```
   # Using yarn (recommended)
   yarn install

   # Or using npm
   npm install
   ```
3. Start the development server

   ```
   # Using yarn
   yarn dev

   # Or using npm
   npm run dev
   ```

### View the Developer Dashboard[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#view-the-developer-dashboard) <a href="#view-the-developer-dashboard" id="view-the-developer-dashboard"></a>

Open a browser window to `http://localhost:8080`.

Here, you can see both your currency and global clusters at work. You should see the snapshot ordinals for the Global L0 and the Currency L0 increment on your dashboard. Also notice that you can inspect each snapshot to see its contents. Any transactions sent on the network will appear in the tables below - there are separate tables for DAG and Metagraph Token transactions.

The dashboard is designed to work with the Euclid Development Environment default settings out-of-the-box, but if you need to change network settings, they can be found in the `.env` file at the root of the project.

### Send a Transaction[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#send-a-transaction) <a href="#send-a-transaction" id="send-a-transaction"></a>

The Developer Dashboard comes pre-installed with scripts to send transactions to your running metagraph. The scripts use [dag4.js](https://github.com/StardustCollective/dag4.js) to interact with the network based on the settings in your `.env` file.

**Single Transaction**[**​**](https://docs.constellationnetwork.io/sdk/guides/send-transaction#single-transaction)

Single transactions can be sent on the command line for easy testing. The transaction below should succeed with the default configuration.

```
yarn metagraph-transaction:send --seed="drift doll absurd cost upon magic plate often actor decade obscure smooth" --transaction='{"destination": "DAG4o41NzhfX6DyYBTTXu6sJa6awm36abJpv89jB","amount":99, "fee":0}'
```

**Bulk Transactions**[**​**](https://docs.constellationnetwork.io/sdk/guides/send-transaction#bulk-transactions)

You can send bulk transactions to the network by calling `send-bulk` and providing a path to a json file with transaction configuration. A sample JSON file is provided for you which will work with the default configuration.

```
yarn metagraph-transaction:send-bulk --config="./scripts/send_transactions/batch_transactions.example.json"
```

**View Transactions**[**​**](https://docs.constellationnetwork.io/sdk/guides/send-transaction#view-transactions)

Return to the dashboard and look in the Currency Transactions table. You should see the transactions you just sent. You can also view the contents of the snapshot that the transaction's block was included in.

### Monitoring[​](https://docs.constellationnetwork.io/sdk/guides/send-transaction#monitoring) <a href="#monitoring" id="monitoring"></a>

Now that you have sent a transaction or two we can check on the stability of the network with the [Telemetry Dashboard](https://docs.constellationnetwork.io/sdk/elements/telemetry-dashboard). The Telemetry Dashboard is composed of two containers included as part of the Development Environment: a Prometheus instance and a Grafana instance.

The dashboard is hosted on the Grafana instance which can be accessed at `http://localhost:3000/`.

The initial login and password are:

```
username: admin
password: admin
```

The Grafana instance includes two dashboards which can be found in the menu on the left. One dashboard monitors the Global L0 and DAG L1 (if you have it running). The other monitors the Currency L0 and Currency L1. More information can be found in the [Telemetry Dashboard](https://docs.constellationnetwork.io/sdk/elements/telemetry-dashboard) section.
# Manual Setup

This guide walks through the detailed process of manually creating a minimal development environment using docker containers and manual configuration. Most developers will be more productive using the automatic setup and configuration of the Euclid Development Environment with the Hydra CLI. The following is provided for project teams looking to create their own custom configurations outside the default development environment.

### Generate P12 Files[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#generate-p12-files) <a href="#generate-p12-files" id="generate-p12-files"></a>

Generate your own `p12` files following the steps below: (java 11 must be installed)

1. Download the cl-keytool file [here](https://github.com/Constellation-Labs/tessellation/releases)
2. We need to generate 3 `p12` files: 1 for Genesis Nodes (Global L0, Currency L0, and Currency L1 - 1), 1 for second node on cluster (Currency L1 - 2), 1 for third node on cluster (Currency L1 - 3).
3. Export the follow variables on your terminal with the values replaced to generate the first `p12` file.

```
export CL_KEYSTORE=":name-of-your-file.p12"
export CL_KEYALIAS=":name-of-your-file"
export CL_PASSWORD=":password"
```

1. Run the following instruction:

```
java -jar cl-keytool.jar generate
```

1. This will generate the first file for you
2. Change the variables CL\_KEYSTORE, CL\_KEYALIAS, and CL\_PASSWORD and repeat the step 2 more times
3. At the end you should have 3 `p12` files

### Common Steps[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#common-steps) <a href="#common-steps" id="common-steps"></a>

#### Create Containers[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#create-containers) <a href="#create-containers" id="create-containers"></a>

With Docker installed on your machine run:

```
docker run -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -it -p 9000:9000 -p 9001:9001 -p 9002:9002--name :container_name_global_l0 --entrypoint "/bin/bash" ubuntu:20.04
docker run -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -it -p 9100:9000 -p 9101:9001 -p 9102:9002--name :container_name_currency_l0 --entrypoint "/bin/bash" ubuntu:20.04
docker run -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -it -p 9200:9000 -p 9201:9001 -p 9202:9002--name :container_name_currency_l1_1 --entrypoint "/bin/bash" ubuntu:20.04
docker run -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -it -p 9300:9000 -p 9301:9001 -p 9302:9002--name :container_name_currency_l1_2 --entrypoint "/bin/bash" ubuntu:20.04
docker run -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -it -p 9400:9000 -p 9401:9001 -p 9402:9002--name :container_name_currency_l1_3 --entrypoint "/bin/bash" ubuntu:20.04
```

*Replace the \`:containername*\` with the name that you want for your container\*

#### Create a Docker Network[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#create-a-docker-network) <a href="#create-a-docker-network" id="create-a-docker-network"></a>

We need to create a docker custom network by running the following:

```
docker network create custom-network-tokens
```

#### Build the Container Libs[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#build-the-container-libs) <a href="#build-the-container-libs" id="build-the-container-libs"></a>

In your container run the following instructions:

```
apt-get update

apt install openjdk-11-jdk -y #jdk 11 to run the jars
apt-get install curl -y #install curl
apt-get install wget -y #install wget
apt-get install gnupg -y #used to add sbt repo
apt-get install vim -y #used to edit files, you can use the editor that you want to

echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | tee /etc/apt/sources.list.d/sbt.list
echo "deb https://repo.scala-sbt.org/scalasbt/debian /" | tee /etc/apt/sources.list.d/sbt_old.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | apt-key add

apt-get update
apt-get install sbt -y #install sbt
```

The instructions above install the dependencies to run correctly the node.

#### Tessellation repository[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#tesselation-repository) <a href="#tesselation-repository" id="tesselation-repository"></a>

Clone the repository:

```
git clone https://github.com/Constellation-Labs/tessellation.git
git checkout v2.0.0-alpha.2
```

**warning**

Make sure you're using the latest version of Tessellation. You can find the most recent release in [**here**](https://github.com/Constellation-Labs/tessellation/releases).

Move to the tessellation folder and checkout to branch/version that you want. You can skip the `git checkout :version` if you want to use the develop default branch

```
cd tesselation
git checkout :version
```

### Global L0[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#global-l0) <a href="#global-l0" id="global-l0"></a>

* Here is the instructions to run specifically Global L0 container.
* Move the `p12` file to container with the instruction:

```
docker cp :directory-of-p12-file container-name:file-name.p12
```

* Inside the docker container make sure that your p12 file exists correctly
* It should be at the root level (same level as the tessellation folder)
* Move to tessellation folder:

```
cd tessellation/
```

* Generate the jars

```
sbt core/assembly wallet/assembly
```

* Check the logs to see which version of global-l0 and wallet was published. It should be something like this:

```
/tessellation/modules/core/target/scala-2.13/tessellation-core-assembly-*.jar
```

* Move these jars to the root folder, like the example below

```
mv codebase/tessellation/modules/core/target/scala-2.13/tessellation-core-assembly-* global-l0.jar
mv codebase/tessellation/modules/wallet/target/scala-2.13/tessellation-wallet-assembly-* cl-wallet.jar
```

* Run the following command to get the clusterId (**store this information**):

```
java -jar cl-wallet.jar show-id
```

* Run the following command to get the clusterAddress (**store this information**):

```
java -jar cl-wallet.jar show-address
```

* Outside the container, run this following command to get your docker container IP

```
docker container inspect :container_name | grep -i IPAddress
```

* Outside the container, we need to join our container to the created network, you can do this with the following command (outside the container)

```
docker network connect custom-network-tokens :container_name  
```

* You can check now your network and see your container there:

```
docker network inspect custom-network
```

* Fill the environment variables necessary to run the container (from your first `p12` file):

```
export CL_KEYSTORE=":name-of-your-file.p12"
export CL_KEYALIAS=":name-of-your-file"
export CL_PASSWORD=":password"
export CL_APP_ENV=dev
export CL_COLLATERAL=0
export CL_ENV=dev
```

* Create one empty genesis file in root directory too (you can add wallets and amounts if you want to):

```
touch genesis.csv
```

* Finally, run the jar:

```
java -jar global-l0.jar run-genesis genesis.csv --ip :ip_of_your_container
```

* Your should see something like this:

```
23:26:53.013 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App environment: Dev
23:26:53.052 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App version: 2.0.0-alpha.2
[WARNING] Your CPU is probably starving. Consider increasing the granularity
of your delays or adding more cedes. This may also be a sign that you are
unintentionally running blocking I/O operations (such as File or InetAddress)
without the blocking combinator.
[WARNING] Your CPU is probably starving. Consider increasing the granularity
of your delays or adding more cedes. This may also be a sign that you are
unintentionally running blocking I/O operations (such as File or InetAddress)
without the blocking combinator.
23:27:03.051 [io-compute-5] INFO  o.t.s.a.TessellationIOApp - Self peerId: b1cf4d017eedb3e187b4d17cef9bdbcfdb2e57b26e346e9186da3a7a2b9110d73481fedbc6de23db51fb932371c54b02fff3388712dcb1e902870da7fa472f66
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.esotericsoftware.kryo.util.UnsafeUtil (file:/code/global-l0.jar) to constructor java.nio.DirectByteBuffer(long,int,java.lang.Object)
WARNING: Please consider reporting this to the maintainers of com.esotericsoftware.kryo.util.UnsafeUtil
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
23:27:04.670 [io-compute-5] INFO  o.t.s.a.TessellationIOApp - Seedlist disabled.
23:27:18.263 [io-compute-1] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9000
23:27:18.270 [io-compute-1] INFO  o.t.s.r.MkHttpServer - HTTP Server name=public started at /0.0.0.0:9000
23:27:18.315 [io-compute-2] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9001
23:27:18.316 [io-compute-2] INFO  o.t.s.r.MkHttpServer - HTTP Server name=p2p started at /0.0.0.0:9001
23:27:18.357 [io-compute-1] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 127.0.0.1:9002
23:27:18.359 [io-compute-1] INFO  o.t.s.r.MkHttpServer - HTTP Server name=cli started at /127.0.0.1:9002
23:27:20.400 [io-compute-3] INFO  o.t.s.i.c.d.N.$anon - Node state changed to=Ready{}
```

* That's all for the global-l0 container

### Currency L0[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#currency-l0) <a href="#currency-l0" id="currency-l0"></a>

* Here is the instructions to run specifically Currency L0 container.
* Move the `p12` file to container with the instruction:

```
docker cp :directory-of-p12-file container-name:file-name.p12
```

* Inside the docker container make sure that your p12 file exists correctly
* It should be at the root level (same level as the tessellation folder)
* Move to tessellation folder:

```
cd tessellation/
```

* Generate the jars

```
sbt currencyL0/assembly
```

* Check the logs to see which version of currency-l0 was published. It should be something like this:

```
/tessellation/modules/currency-l0/target/scala-2.13/tessellation-currency-l0-assembly-*.jar
```

* Move this jar to the root folder, like the example below

```
mv codebase/tessellation/modules/core/target/scala-2.13/tessellation-currency-l0-assembly-* currency-l0.jar
```

* Outside the container, run this following command to get your docker container IP

```
docker container inspect :container_name | grep -i IPAddress
```

* Outside the container, we need to join our container to the created network, you can do this with the following command (outside the container)

```
docker network connect custom-network-tokens :container_name  
```

* You can check now your network and see your container there:

```
docker network inspect custom-network
```

* Fill the environment variables necessary to run the container (from your first `p12` file):

```
export CL_KEYSTORE=":name-of-your-file.p12"
export CL_KEYALIAS=":name-of-your-file"
export CL_PASSWORD=":password"
export CL_GLOBAL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_TOKEN_IDENTIFIER=:id_got_of_command_cl_wallet_show_address
export CL_PUBLIC_HTTP_PORT=9000
export CL_P2P_HTTP_PORT=9001
export CL_CLI_HTTP_PORT=9002
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip-global-l0-container
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_APP_ENV=dev
export CL_COLLATERAL=0
```

* Create one genesis file in root directory too (you can add wallets and amounts if you want to):

```
touch genesis.csv
```

* You should edit this `genesis.csv` to add your addresses and amounts. You can use `vim` for that:

```
vim genesis.csv
```

* Example of genesis content:

```
DAG8pkb7EhCkT3yU87B2yPBunSCPnEdmX2Wv24sZ,1000000000000
DAG4o41NzhfX6DyYBTTXu6sJa6awm36abJpv89jB,1000000000000
DAG4Zd2W2JxL1f1gsHQCoaKrRonPSSHLgcqD7osU,1000000000000
```

* Finally, run the jar:

```
java -jar currency-l0.jar run-genesis genesis.csv --ip :ip_of_current_container
```

* Your should see something like this:

```
23:28:33.769 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App environment: Dev
23:28:33.829 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App version: 2.0.0-alpha.2
23:29:25.489 [io-compute-2] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9000
23:29:25.520 [io-compute-2] INFO  o.t.s.r.MkHttpServer - HTTP Server name=public started at /0.0.0.0:9000
23:29:25.606 [io-compute-2] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9001
23:29:25.608 [io-compute-2] INFO  o.t.s.r.MkHttpServer - HTTP Server name=p2p started at /0.0.0.0:9001
23:29:25.795 [io-compute-3] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 127.0.0.1:9002
23:29:25.796 [io-compute-3] INFO  o.t.s.r.MkHttpServer - HTTP Server name=cli started at /127.0.0.1:9002
23:29:44.671 [io-compute-3] INFO  o.t.c.l.s.s.G.$anon - Genesis binary 3c02294a7a3c7b3a8f2af8c9633a82af46430cda7ffc2de0fc0c6f19afb497e0 and 57a4f918ce8228be1282834ece3e6f69ad87d69b42857dbb227b5e6441b25025 accepted and sent to Global L0
```

* That's all for the currency-l0 container

### Currency L1 - 1[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#currency-l1---1) <a href="#currency-l1---1" id="currency-l1---1"></a>

* Here is the instructions to run specifically Currency L1 - 1 container.
* Move the `p12` file to container with the instruction:

```
docker cp :directory-of-p12-file container-name:file-name.p12
```

* Inside the docker container make sure that your p12 file exists correctly
* It should be at the root level (same level as the tessellation folder)
* Move to tessellation folder:

```
cd tessellation/
```

* Generate the jars

```
sbt currencyL1/assembly
```

* Check the logs to see which version of currency-l1 was published. It should be something like this:

```
/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-*.jar
```

* Move this jar to the root folder, like the example below

```
mv codebase/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-* currency-l1.jar
```

* Outside the container, run this following command to get your docker container IP

```
docker container inspect :container_name | grep -i IPAddress
```

* Outside the container, we need to join our container to the created network, you can do this with the following command (outside the container)

```
docker network connect custom-network-tokens :container_name  
```

* You can check now your network and see your container there:

```
docker network inspect custom-network
```

* Fill the environment variables necessary to run the container (from your first `p12` file):

```
export CL_KEYSTORE=":name-of-your-file.p12"
export CL_KEYALIAS=":name-of-your-file"
export CL_PASSWORD=":password"
export CL_GLOBAL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_TOKEN_IDENTIFIER=:id_got_of_command_cl_wallet_show_address
export CL_PUBLIC_HTTP_PORT=9000
export CL_P2P_HTTP_PORT=9001
export CL_CLI_HTTP_PORT=9002
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip-global-l0-container
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_L0_PEER_HTTP_HOST=:ip-currency-l0-container
export CL_L0_PEER_HTTP_PORT=9000
export CL_APP_ENV=dev
export CL_COLLATERAL=0
```

* Finally, run the jar:

```
java -jar currency-l1.jar run-initial-validator  --ip :ip_of_current_container
```

* Your should see something like this:

```
23:31:34.892 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App environment: Dev
23:31:34.901 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App version: 2.0.0-alpha.2
23:31:38.257 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Self peerId: b1cf4d017eedb3e187b4d17cef9bdbcfdb2e57b26e346e9186da3a7a2b9110d73481fedbc6de23db51fb932371c54b02fff3388712dcb1e902870da7fa472f66
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.esotericsoftware.kryo.util.UnsafeUtil (file:/code/currency-l1.jar) to constructor java.nio.DirectByteBuffer(long,int,java.lang.Object)
WARNING: Please consider reporting this to the maintainers of com.esotericsoftware.kryo.util.UnsafeUtil
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
23:31:39.054 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Seedlist disabled.
23:31:49.892 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9000
23:31:49.895 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=public started at /0.0.0.0:9000
23:31:49.917 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9001
23:31:49.918 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=p2p started at /0.0.0.0:9001
23:31:49.943 [io-compute-3] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 127.0.0.1:9002
23:31:49.943 [io-compute-3] INFO  o.t.s.r.MkHttpServer - HTTP Server name=cli started at /127.0.0.1:9002
23:31:52.135 [io-compute-6] INFO  o.t.s.i.c.d.N.$anon - Node state changed to=Ready{}
23:31:57.435 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:31:57.635 [io-compute-3] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.598 [io-compute-1] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.658 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:06.858 [io-compute-0] INFO  o.t.d.l.StateChannel - Pulled following global snapshot: SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676}
23:32:06.959 [io-compute-0] INFO  o.t.d.l.StateChannel - Snapshot processing result: DownloadPerformed{reference=SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676},addedBlock=Set(),removedObsoleteBlocks=Set()}
23:32:07.172 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:07.177 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:12.178 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:12.219 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger

```

* That's all for the currency-l1-1 container

### Currency L1 - 2[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#currency-l1---2) <a href="#currency-l1---2" id="currency-l1---2"></a>

* Here is the instructions to run specifically Currency L1 - 2 container.
* Move the `p12` file to container with the instruction (second `p12` file):

```
docker cp :directory-of-p12-file-2 container-name:file-name.p12
```

* Inside the docker container make sure that your p12 file exists correctly
* It should be at the root level (same level as the tessellation folder)
* Move to tessellation folder:

```
cd tessellation/
```

* Generate the jars

```
sbt currencyL1/assembly
```

* Check the logs to see which version of currency-l1 was published. It should be something like this:

```
/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-*.jar
```

* Move this jar to the root folder, like the example below

```
mv codebase/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-* currency-l1.jar
```

* Outside the container, run this following command to get your docker container IP

```
docker container inspect :container_name | grep -i IPAddress
```

* Outside the container, we need to join our container to the created network, you can do this with the following command (outside the container)

```
docker network connect custom-network-tokens :container_name  
```

* You can check now your network and see your container there:

```
docker network inspect custom-network
```

* Fill the environment variables necessary to run the container (from your first `p12` file):

```
export CL_KEYSTORE=":name-of-your-second-file.p12"
export CL_KEYALIAS=":name-of-your-second-file"
export CL_PASSWORD=":password"
export CL_GLOBAL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_TOKEN_IDENTIFIER=:id_got_of_command_cl_wallet_show_address
export CL_PUBLIC_HTTP_PORT=9000
export CL_P2P_HTTP_PORT=9001
export CL_CLI_HTTP_PORT=9002
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip-global-l0-container
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_L0_PEER_HTTP_HOST=:ip-currency-l0-container
export CL_L0_PEER_HTTP_PORT=9000
export CL_APP_ENV=dev
export CL_COLLATERAL=0
```

* Finally, run the jar:

```
java -jar currency-l1.jar run-validator  --ip :ip_of_current_container
```

* Your should see something like this:

```
23:31:34.892 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App environment: Dev
23:31:34.901 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App version: 2.0.0-alpha.2
23:31:38.257 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Self peerId: b1cf4d017eedb3e187b4d17cef9bdbcfdb2e57b26e346e9186da3a7a2b9110d73481fedbc6de23db51fb932371c54b02fff3388712dcb1e902870da7fa472f66
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.esotericsoftware.kryo.util.UnsafeUtil (file:/code/currency-l1.jar) to constructor java.nio.DirectByteBuffer(long,int,java.lang.Object)
WARNING: Please consider reporting this to the maintainers of com.esotericsoftware.kryo.util.UnsafeUtil
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
23:31:39.054 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Seedlist disabled.
23:31:49.892 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9000
23:31:49.895 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=public started at /0.0.0.0:9000
23:31:49.917 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9001
23:31:49.918 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=p2p started at /0.0.0.0:9001
23:31:49.943 [io-compute-3] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 127.0.0.1:9002
23:31:49.943 [io-compute-3] INFO  o.t.s.r.MkHttpServer - HTTP Server name=cli started at /127.0.0.1:9002
23:31:52.135 [io-compute-6] INFO  o.t.s.i.c.d.N.$anon - Node state changed to=Ready{}
23:31:57.435 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:31:57.635 [io-compute-3] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.598 [io-compute-1] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.658 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:06.858 [io-compute-0] INFO  o.t.d.l.StateChannel - Pulled following global snapshot: SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676}
23:32:06.959 [io-compute-0] INFO  o.t.d.l.StateChannel - Snapshot processing result: DownloadPerformed{reference=SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676},addedBlock=Set(),removedObsoleteBlocks=Set()}
23:32:07.172 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:07.177 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:12.178 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:12.219 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger

```

* That's all for the currency-l1-2 container

### Currency L1 - 3[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#currency-l1---3) <a href="#currency-l1---3" id="currency-l1---3"></a>

* Here is the instructions to run specifically Currency L1 - 2 container.
* Move the `p12` file to container with the instruction (third `p12` file):

```
docker cp :directory-of-p12-file-3 container-name:file-name.p12
```

* Inside the docker container make sure that your p12 file exists correctly
* It should be at the root level (same level as the tessellation folder)
* Move to tessellation folder:

```
cd tessellation/
```

* Generate the jars

```
sbt currencyL1/assembly
```

* Check the logs to see which version of currency-l1 was published. It should be something like this:

```
/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-*.jar
```

* Move this jar to the root folder, like the example below

```
mv codebase/tessellation/modules/currency-l1/target/scala-2.13/tessellation-currency-l1-assembly-* currency-l1.jar
```

* Outside the container, run this following command to get your docker container IP

```
docker container inspect :container_name | grep -i IPAddress
```

* Outside the container, we need to join our container to the created network, you can do this with the following command (outside the container)

```
docker network connect custom-network-tokens :container_name  
```

* You can check now your network and see your container there:

```
docker network inspect custom-network
```

* Fill the environment variables necessary to run the container (from your first `p12` file):

```
export CL_KEYSTORE=":name-of-your-third-file.p12"
export CL_KEYALIAS=":name-of-your-third-file"
export CL_PASSWORD=":password"
export CL_GLOBAL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_PEER_ID=:id_got_of_command_cl_wallet_show_id
export CL_L0_TOKEN_IDENTIFIER=:id_got_of_command_cl_wallet_show_address
export CL_PUBLIC_HTTP_PORT=9000
export CL_P2P_HTTP_PORT=9001
export CL_CLI_HTTP_PORT=9002
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip-global-l0-container
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_L0_PEER_HTTP_HOST=:ip-currency-l0-container
export CL_L0_PEER_HTTP_PORT=9000
export CL_APP_ENV=dev
export CL_COLLATERAL=0
```

* Finally, run the jar:

```
java -jar currency-l1.jar run-validator  --ip :ip_of_current_container
```

* Your should see something like this:

```
23:31:34.892 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App environment: Dev
23:31:34.901 [io-compute-blocker-3] INFO  o.t.s.a.TessellationIOApp - App version: 2.0.0-alpha.2
23:31:38.257 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Self peerId: b1cf4d017eedb3e187b4d17cef9bdbcfdb2e57b26e346e9186da3a7a2b9110d73481fedbc6de23db51fb932371c54b02fff3388712dcb1e902870da7fa472f66
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.esotericsoftware.kryo.util.UnsafeUtil (file:/code/currency-l1.jar) to constructor java.nio.DirectByteBuffer(long,int,java.lang.Object)
WARNING: Please consider reporting this to the maintainers of com.esotericsoftware.kryo.util.UnsafeUtil
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
23:31:39.054 [io-compute-1] INFO  o.t.s.a.TessellationIOApp - Seedlist disabled.
23:31:49.892 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9000
23:31:49.895 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=public started at /0.0.0.0:9000
23:31:49.917 [io-compute-6] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 0.0.0.0:9001
23:31:49.918 [io-compute-6] INFO  o.t.s.r.MkHttpServer - HTTP Server name=p2p started at /0.0.0.0:9001
23:31:49.943 [io-compute-3] INFO  o.h.e.s.EmberServerBuilderCompanionPlatform - Ember-Server service bound to address: 127.0.0.1:9002
23:31:49.943 [io-compute-3] INFO  o.t.s.r.MkHttpServer - HTTP Server name=cli started at /127.0.0.1:9002
23:31:52.135 [io-compute-6] INFO  o.t.s.i.c.d.N.$anon - Node state changed to=Ready{}
23:31:57.435 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:31:57.635 [io-compute-3] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.598 [io-compute-1] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:02.658 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:06.858 [io-compute-0] INFO  o.t.d.l.StateChannel - Pulled following global snapshot: SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676}
23:32:06.959 [io-compute-0] INFO  o.t.d.l.StateChannel - Snapshot processing result: DownloadPerformed{reference=SnapshotReference{height=0,subHeight=11,ordinal=SnapshotOrdinal{value=11},lastSnapshotHash=93b341d24ce00f43abe054448afe29a43d6997bc0df6bd38821fe394d69a969f,hash=bc8aade10ab11efac2b180c48e78b060420dda6e72019061faf82ff8a8369fd7,proofsHash=9b869faaa608b3f3b8e2a9a4e548d371c11977ba2f5a498b9062f8d78d5e6676},addedBlock=Set(),removedObsoleteBlocks=Set()}
23:32:07.172 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:07.177 [io-compute-2] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger
23:32:12.178 [io-compute-0] DEBUG o.t.d.l.d.c.b.Validator - Cannot start own consensus: Not enough peers, Not enough tips, No transactions
23:32:12.219 [io-compute-0] DEBUG o.t.d.l.StateChannel - Received block consensus input to process: InspectionTrigger

```

* That's all for the currency-l1-3 container

### Joining Currency L1 containers to build the cluster[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#joining-currency-l1-containers-to-build-the-cluster) <a href="#joining-currency-l1-containers-to-build-the-cluster" id="joining-currency-l1-containers-to-build-the-cluster"></a>

* We need to join the 2 and 3 currency L1 container to the first one, to build the cluster.
* For that, we need to open another terminal instance and run

```
docker exec -it :l1-currency-2-container-name /bin/bash
```

* Then we need to call this:

```
curl -v -X POST http://localhost:9002/cluster/join -H \"Content-type: application/json\" -d '{ \"id\":\":id_got_of_command_cl_wallet_show_id\", \"ip\": \":ip_of_currency_l1_1_container\", \"p2pPort\": 9001 }'
```

* Repeat the same with the third Currency L1 container
* You now should have the cluster build, if you access the url: `http://localhost:9200/cluster/info` you should see the nodes

### Next Steps[​](https://docs.constellationnetwork.io/sdk/guides/manual-setup#next-steps) <a href="#next-steps" id="next-steps"></a>

You should now have a minimal development environment installed and running 🎉

{% hint style="success" %}
**Send your first transaction!**

Set up the FE Developer Dashboard and send your hello world metagraph transaction [here](https://docs.constellationnetwork.io/metagraph-development/guides/send-a-transaction)
{% endhint %}
# Customize Rewards Logic

In this guide, we will walk through two different methods of customizing rewards logic within your metagraph.

### Understanding Rewards[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#understanding-rewards) <a href="#understanding-rewards" id="understanding-rewards"></a>

Rewards are emitted on every timed snapshot of the metagraph and increase the circulating supply of the metagraph token beyond the initial balances defined in genesis.csv. These special transaction types can be used to distribute your currency to fund node operators, or create fixed pools of tokens over time.

By default, no rewards are distributed by a metagraph using the Metagraph Framework which results in a static circulating supply. The rewards customizations described below create inflationary currencies - the rate of which can be controlled by the specific logic introduced. Similarly, a maximum token supply can easily be introduced if desired to prevent unlimited inflation.

#### The Rewards Function[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#the-rewards-function) <a href="#the-rewards-function" id="the-rewards-function"></a>

The rewards function includes contextual information from the prior incremental update, including any data produced. Additionally, this function can include customized code capable of invoking any library function of your choice, allowing you to support truly custom use cases and advanced tokenomics structures. The following examples serve as a foundation for typical use cases, which you can expand upon and tailor to your project's needs.

### Before You Start[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#before-you-start) <a href="#before-you-start" id="before-you-start"></a>

This guide assumes that you have configured your local environment based on the [Quick Start Guide](https://docs.constellationnetwork.io/sdk/guides/quick-start) and have at least your `global-l0`, `currency-l0`, `currency-l1` clusters configured.

We will be updating the code within your project in the L0 module. This can be found in:

```
source/project/<project_name>/modules/l0/src/main/Main.scala
```

Please note, the examples below show all logic within a single file to make copy/pasting the code as simple as possible. In a production application you would most likely want to split the code into multiple files.

### Examples[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#examples) <a href="#examples" id="examples"></a>

These examples show different ways that rewards logic can be customized within your metagraph. The concepts displayed can be used independently or combined for further customization based on the business logic of your project.

#### Example: Distribute Rewards to Fixed Addresses[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#example-distribute-rewards-to-fixed-addresses) <a href="#example-distribute-rewards-to-fixed-addresses" id="example-distribute-rewards-to-fixed-addresses"></a>

Add the following code to your L0 Main.scala file.

```
package com.my.currency.l0

import cats.effect.{Async, IO}
import org.tessellation.BuildInfo
import org.tessellation.currency.dataApplication.BaseDataApplicationL0Service
import org.tessellation.currency.l0.CurrencyL0App
import org.tessellation.currency.schema.currency.{
  CurrencyBlock,
  CurrencyIncrementalSnapshot,
  CurrencySnapshotStateProof,
  CurrencyTransaction
}
import org.tessellation.schema.address.Address
import org.tessellation.schema.balance.Balance
import org.tessellation.schema.cluster.ClusterId
import org.tessellation.schema.transaction.{
  RewardTransaction,
  TransactionAmount
}
import org.tessellation.sdk.domain.rewards.Rewards
import org.tessellation.sdk.infrastructure.consensus.trigger.ConsensusTrigger
import org.tessellation.security.SecurityProvider
import org.tessellation.security.signature.Signed

import eu.timepit.refined.auto._
import cats.syntax.applicative._

import java.util.UUID
import scala.collection.immutable.{SortedSet, SortedMap}

object RewardsMintForPredefinedAddresses {
  def make[F[_]: Async] =
    new Rewards[
      F,
      CurrencyTransaction,
      CurrencyBlock,
      CurrencySnapshotStateProof,
      CurrencyIncrementalSnapshot
    ] {
      def distribute(
        lastArtifact: Signed[CurrencyIncrementalSnapshot],
        lastBalances: SortedMap[Address, Balance],
        acceptedTransactions: SortedSet[Signed[CurrencyTransaction]],
        trigger: ConsensusTrigger
      ): F[SortedSet[RewardTransaction]] = SortedSet(
        Address("DAG8pkb7EhCkT3yU87B2yPBunSCPnEdmX2Wv24sZ"),
        Address("DAG4o41NzhfX6DyYBTTXu6sJa6awm36abJpv89jB")
      ).map(RewardTransaction(_, TransactionAmount(55_500_0000L))).pure[F]
    }
}

object Main
  extends CurrencyL0App(
    "custom-rewards-l0",
    "custom-rewards L0 node",
    ClusterId(UUID.fromString("517c3a05-9219-471b-a54c-21b7d72f4ae5")),
    version = BuildInfo.version
  ) {

  def dataApplication: Option[BaseDataApplicationL0Service[IO]] = None

  def rewards(implicit sp: SecurityProvider[IO]) = Some(
    RewardsMintForPredefinedAddresses.make[IO]
  )
}
```

The code distributes 5.55 token rewards on each timed snapshot to two hardcoded addresses:

* DAG8pkb7EhCkT3yU87B2yPBunSCPnEdmX2Wv24sZ
* DAG4o41NzhfX6DyYBTTXu6sJa6awm36abJpv89jB

These addresses could represent treasury wallets or manually distributed rewards pools. Update the number of wallets and amounts to match your use-case.

**Rebuild Clusters**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#rebuild-clusters)

Run the following commands to rebuild your clusters with the new code:

```
scripts/hydra destroy
scripts/hydra build --no_cache
```

Once built, run hydra start to see your changes take effect.

```
scripts/hydra start-genesis
```

**View Changes**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#view-changes)

Using the [Developer Dashboard](https://docs.constellationnetwork.io/sdk/elements/developer-dashboard) you should see the balances of the two wallets above increase by 5.5 tokens after each snapshot.

Inspecting the snapshot body, you should also see an array of "rewards" transactions present.

![Rewards Transactions in Snapshot](https://docs.constellationnetwork.io/assets/images/rewards-snapshot-9172b617bb518907ba185e376d3d96c2.png)

#### Example: Distribute Rewards to Validator Nodes[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#example-distribute-rewards-to-validator-nodes) <a href="#example-distribute-rewards-to-validator-nodes" id="example-distribute-rewards-to-validator-nodes"></a>

Add the following code to your L0 Main.scala file.

```
package com.my.currency.l0

import cats.effect.{Async, IO}
import cats.implicits.{toFoldableOps, toFunctorOps, toTraverseOps}
import org.tessellation.BuildInfo
import org.tessellation.currency.dataApplication.BaseDataApplicationL0Service
import org.tessellation.currency.l0.CurrencyL0App
import org.tessellation.currency.schema.currency.{CurrencyBlock, CurrencyIncrementalSnapshot, CurrencySnapshotStateProof, CurrencyTransaction}
import org.tessellation.schema.address.Address
import org.tessellation.schema.balance.Balance
import org.tessellation.schema.cluster.ClusterId
import org.tessellation.schema.transaction.{RewardTransaction, TransactionAmount}
import org.tessellation.sdk.domain.rewards.Rewards
import org.tessellation.security.SecurityProvider
import org.tessellation.security.signature.Signed
import eu.timepit.refined.auto._
import org.tessellation.sdk.infrastructure.consensus.trigger.ConsensusTrigger

import java.util.UUID
import scala.collection.immutable.{SortedMap, SortedSet}

object RewardsMint1ForEachFacilitator {
  def make[F[_]: Async: SecurityProvider] =
    new Rewards[F, CurrencyTransaction, CurrencyBlock, CurrencySnapshotStateProof, CurrencyIncrementalSnapshot] {
      def distribute(
        lastArtifact: Signed[CurrencyIncrementalSnapshot],
        lastBalances: SortedMap[Address, Balance],
        acceptedTransactions: SortedSet[Signed[CurrencyTransaction]],
        trigger: ConsensusTrigger
      ): F[SortedSet[RewardTransaction]] = {
        val facilitatorsToReward = lastArtifact.proofs.map(_.id)
        val addresses = facilitatorsToReward.toList.traverse(_.toAddress)
        val rewardsTransactions = addresses.map(addresses => {
          val addressesAsList = addresses.map(RewardTransaction(_, TransactionAmount(1_000_0000L)))
          collection.immutable.SortedSet.empty[RewardTransaction] ++ addressesAsList
        })

        rewardsTransactions
      }
    }
}

object Main
  extends CurrencyL0App(
    "custom-rewards-l0",
    "custom-rewards L0 node",
    ClusterId(UUID.fromString("517c3a05-9219-471b-a54c-21b7d72f4ae5")),
    version = BuildInfo.version
  ) {

  def dataApplication: Option[BaseDataApplicationL0Service[IO]] = None

  def rewards(implicit sp: SecurityProvider[IO]) = Some(
    RewardsMint1ForEachFacilitator.make[IO]
  )
}
```

The code distributes 1 token reward on each timed snapshot to each validator node that participated in the most recent round of consensus.

**Rebuild Clusters**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#rebuild-clusters-1)

Run the following commands to rebuild your clusters with the new code:

```
scripts/hydra destroy
scripts/hydra build --no_cache
```

Once built, run hydra start to see your changes take effect.

```
scripts/hydra start-genesis
```

**View Changes**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#view-changes-1)

Using the [Developer Dashboard](https://docs.constellationnetwork.io/sdk/elements/developer-dashboard) you should see the balances of the wallets in each node in your L0 cluster above increase by 1 token after each snapshot.

Inspecting the snapshot body, you should also see an array of "rewards" transactions present.

#### Example: Distribute Rewards Based on API Data[​](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#example-distribute-rewards-based-on-api-data) <a href="#example-distribute-rewards-based-on-api-data" id="example-distribute-rewards-based-on-api-data"></a>

Add the following code to your L0 Main.scala file.

```
package com.my.currency.l0

import cats.data.NonEmptyList
import cats.effect.{Async, IO}
import cats.implicits.catsSyntaxApplicativeId
import derevo.circe.magnolia.{decoder, encoder}
import derevo.derive
import org.tessellation.BuildInfo
import org.tessellation.currency.dataApplication.BaseDataApplicationL0Service
import org.tessellation.currency.l0.CurrencyL0App
import org.tessellation.currency.schema.currency.{CurrencyBlock, CurrencyIncrementalSnapshot, CurrencySnapshotStateProof, CurrencyTransaction}
import org.tessellation.schema.address.Address
import org.tessellation.schema.balance.Balance
import org.tessellation.schema.cluster.ClusterId
import org.tessellation.schema.transaction.{RewardTransaction, TransactionAmount}
import org.tessellation.sdk.domain.rewards.Rewards
import org.tessellation.security.SecurityProvider
import org.tessellation.security.signature.Signed
import eu.timepit.refined.numeric.Positive
import eu.timepit.refined.refineV
import eu.timepit.refined.types.numeric.PosLong
import org.tessellation.sdk.infrastructure.consensus.trigger.ConsensusTrigger
import io.circe.parser.decode

import java.util.UUID
import scala.collection.immutable.{SortedMap, SortedSet}

object RewardsMintForEachAddressOnApi {
  private def getRewardAddresses: List[Address] = {

    @derive(decoder, encoder)
    case class AddressTimeEntry(address: Address, date: String)

    try {
      //Using host.docker.internal as host because we will fetch this from a docker container to a API that is on local machine
      //You should replace to your url
      val response = requests.get("http://host.docker.internal:8000/addresses")
      val body = response.text()

      println("API response" + body)

      decode[List[AddressTimeEntry]](body) match {
        case Left(e) => throw e
        case Right(addressTimeEntries) => addressTimeEntries.map(_.address)
      }
    } catch {
      case x: Exception => {
        println(s"Error when fetching API: ${x.getMessage}")
        List[Address]()
      }
    }
  }

  private def getAmountPerWallet(addressCount: Int): PosLong = {
    val totalAmount: Long = 100_000_0000L
    val amountPerWallet: Either[String, PosLong] = refineV[Positive](totalAmount / addressCount)

    amountPerWallet.toOption match {
      case Some(amount) => amount
      case None =>
        println("Error getting amount per wallet")
        PosLong(1)
    }
  }

  def make[F[_] : Async ] =
    new Rewards[F, CurrencyTransaction, CurrencyBlock, CurrencySnapshotStateProof, CurrencyIncrementalSnapshot] {
      def distribute(
                      lastArtifact: Signed[CurrencyIncrementalSnapshot],
                      lastBalances: SortedMap[Address, Balance],
                      acceptedTransactions: SortedSet[Signed[CurrencyTransaction]],
                      trigger: ConsensusTrigger
                    ): F[SortedSet[RewardTransaction]] = {

        val rewardAddresses = getRewardAddresses
        val foo = NonEmptyList.fromList(rewardAddresses)

        foo match {
          case Some(addresses) =>
            val amountPerWallet = getAmountPerWallet(addresses.size)
            val rewardAddressesAsSortedSet = SortedSet(addresses.toList: _*)

            rewardAddressesAsSortedSet.map(address => {
              val txnAmount = TransactionAmount(amountPerWallet)
              RewardTransaction(address, txnAmount)
            }).pure[F]

          case None =>
            println("Could not find reward addresses")
            val nodes: SortedSet[RewardTransaction] = SortedSet.empty
            nodes.pure[F]
        }
      }
    }
}

object Main
  extends CurrencyL0App(
    "custom-rewards-l0",
    "custom-rewards L0 node",
    ClusterId(UUID.fromString("517c3a05-9219-471b-a54c-21b7d72f4ae5")),
    version = BuildInfo.version
  ) {

  def dataApplication: Option[BaseDataApplicationL0Service[IO]] = None

  def rewards(implicit sp: SecurityProvider[IO]) = Some(
    RewardsMintForEachAddressOnApi.make[IO]
  )
}
```

The code distributes token rewards on each timed snapshot to each address that is returned from a custom API.

On this [Repository](https://github.com/Constellation-Labs/metagraph-examples/) you can take a better look at the template example and the custom API.

In the repository, the code will distribute the amount of 100 tokens between the number of returned wallets (in this case the maximum of 20 latest wallets)

**Rebuild Clusters**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#rebuild-clusters-2)

Run the following commands to rebuild your clusters with the new code:

```
scripts/hydra destroy
scripts/hydra build --no_cache
```

Once built, run hydra start to see your changes take effect.

```
scripts/hydra start-genesis
```

**View Changes**[**​**](https://docs.constellationnetwork.io/sdk/guides/customize-rewards#view-changes-2)

Using the [Developer Dashboard](https://docs.constellationnetwork.io/sdk/elements/developer-dashboard) you should see the balances of the wallets in each node in your L0 cluster above increase by ( 100 / :number\_of\_wallets ) tokens after each snapshot.

Inspecting the snapshot body, you should also see an array of "rewards" transactions present.
# Custom Data Validation

In this guide, we will walk through a Data Application and a simple example implementation of an IoT use case. Complete code for this guide can be found in the [metagraph examples repo](https://github.com/Constellation-Labs/metagraph-examples) on Github. See the [Water and Energy Use](https://github.com/Constellation-Labs/metagraph-examples/tree/main/examples/DataApi-Water-And-Energy-Usage) example.

**Want more detail?**

Looking for additional detail on Data Application development? More information is available in [Data Application](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/data).

### Before You Start[​](https://docs.constellationnetwork.io/sdk/guides/custom-data#before-you-start) <a href="#before-you-start" id="before-you-start"></a>

In order to get started, install dependencies as described in the [Quick Start Guide](https://docs.constellationnetwork.io/metagraph-development/guides/quick-start). You will need at least the `global-l0`, `metagraph-l0`, and `metagraph-l1-data` containers enabled in your `euclid.json` file for this guide.

**Example euclid.json values**

```
  "version": "0.9.1",
  "tessellation_version": "2.2.0",
  "project_name": "custom-project",
  "framework": {
    "name": "currency",
    "modules": [
      "data"
    ],
    "version": "v2.2.0",
    "ref_type": "tag"
  },
  "layers": [
    "global-l0",
    "metagraph-l0",
    "currency-l1",
    "data-l1"
  ],
```

**Installing Templates with Hydra**

To initiate a metagraph using a template, we provide several options in our [GitHub repository](https://github.com/Constellation-Labs/metagraph-examples). Follow these steps to utilize a template:

1\.  List Available Templates: First, determine th\`e templates at your disposal by executing the command below:

```
./scripts/hydra install-template --list
```

2\.  Install a Template: After selecting a template, replace `:repo_name` with your chosen repository's name to install it. For instance:

```
./scripts/hydra install-template :repo_name
```

As a practical example, if you wish to install the `water-and-energy-usage` template, your command would look like this:

```
./scripts/hydra install-template water-and-energy-usage
```

This process will set up a metagraph based on the selected template.

Within your Euclid modules directory (source/project/water-and-energy-usage/modules) you will see three module directories: l0 (metagraph l0), l1 (currency l1), and data\_l1 (data l1). Each module has a Main.scala file that defines the application that will run at each corresponding layer.

```
- source
  - project
    - water-and-energy-usage
      - modules
        - l0
        - l1
        - data_1
        - shared_data
      - project
```

### Send Data[​](https://docs.constellationnetwork.io/sdk/guides/custom-data#send-data) <a href="#send-data" id="send-data"></a>

Edit the `send_data_transaction.js` script and fill in the `globalL0Url`, `metagraphL1DataUrl`, and `walletPrivateKey` variables. The private key can be generated with the `dag4.keystore.generatePrivateKey()` method if you don't already have one.

Once the variables are updated, save the file. You can now run `node send_data_transaction.js` to send data to the `/data` endpoint.

#### Check State Updates[​](https://docs.constellationnetwork.io/sdk/guides/custom-data#check-state-updates) <a href="#check-state-updates" id="check-state-updates"></a>

Using the custom endpoint created in the data\_l1 Main.scala `routes` method, we can check the metagraph state as updates are sent.

Using your browser, navigate to `<your L1 base url>/data-application/addresses` to see the complete state including all devices that have sent data. You can also check the state of an individual device using the `<your L1 base url>/data-application/addresses/:address` endpoint.

You should see a response like this:

```
{
    "DAG4bQGdnDJ5okVdsdtvJzBwQoPGjLNzN7HC1CBV": {
        "energy": {
            "usage": 7,
            "timestamp": 1689441998946
        },
        "water": {
            "usage": 7,
            "timestamp": 1689441998946
        }
    }
}
```

### Next Steps[​](https://docs.constellationnetwork.io/sdk/guides/custom-data#next-steps) <a href="#next-steps" id="next-steps"></a>

This brief guide demonstrates the ability to update and view on-chain state based on the Metagraph Framework's Data Application layer. Detailed information about the framework methods used can be found in the [example README file](https://github.com/Constellation-Labs/metagraph-examples/blob/main/examples/DataApi-Water-And-Energy-Usage/README.md) and in comments throughout the code. Also see additional break downs of the application lifecycle methods in the [Data API](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/data) section.
# Working with p12 files

### Generating p12 files[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#generating-p12-files) <a href="#generating-p12-files" id="generating-p12-files"></a>

This guide will walk you through the process of creating your own custom p12 files. We will generate three files to match the original Euclid Development Environment project's configuration.

{% hint style="warning" %}
**Caution**

If using a Euclid Development Environment project, you must update your configuration to use your own custom p12 files. Projects submitted with the default p12 files that come with the project will be rejected.
{% endhint %}

#### Step 1: Download `cl-keytool.jar` Executable[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#step-1-download-cl-keytooljar-executable) <a href="#step-1-download-cl-keytooljar-executable" id="step-1-download-cl-keytooljar-executable"></a>

Download the `cl-keytool.jar` executable. This is included as an asset with each release of Tessellation.

#### Step 2: Set Up Your Environment Variables[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#step-2-set-up-your-environment-variables) <a href="#step-2-set-up-your-environment-variables" id="step-2-set-up-your-environment-variables"></a>

Modify the following variables with your custom details and export them to your environment:

```
export CL_KEYSTORE=":your_custom_file_name.p12"
export CL_KEYALIAS=":your_custom_file_alias"
export CL_PASSWORD=":your_custom_file_password"
```

Replace `:your_custom_file_name.p12`, `:your_custom_file_alias`, and `:your_custom_file_password` with your specific file name, alias, and password, respectively.

#### Step 3: Generate Your Custom .p12 File[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#step-3-generate-your-custom-p12-file) <a href="#step-3-generate-your-custom-p12-file" id="step-3-generate-your-custom-p12-file"></a>

Execute the following command to generate your custom .p12 file:

```
java -jar cl-keytool.jar generate
```

This will create a .p12 file in the directory from which the command was executed.

#### Step 4: Repeat the Process[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#step-4-repeat-the-process) <a href="#step-4-repeat-the-process" id="step-4-repeat-the-process"></a>

Repeat steps 2 and 3 two more times to create a total of three custom p12 files. Remember to change the file name each time to avoid overwriting any existing files.

### Finding Your Node IDs[​](https://docs.constellationnetwork.io/sdk/guides/working-with-p12-files#finding-your-node-ids) <a href="#finding-your-node-ids" id="finding-your-node-ids"></a>

Your node ID is the public key of your wallet which will be stored as a p12 file.

{% hint style="warning" %}
**Caution**

If using a Euclid Development Environment project, you must update your configuration to use your own custom p12 files. Projects submitted with the default p12 files that come with the project will be rejected.
{% endhint %}

[**How to generate p12 files**](https://docs.constellationnetwork.io/sdk/guides/generating-with-p12-files)

Download the `cl-wallet.jar` executable. This is distributed as an asset with each [release of Tessellation](https://github.com/Constellation-Labs/tessellation/releases).

Editing the details of the following variables and export to your environment.

```
export CL_KEYSTORE=":your_file_name.p12"
export CL_KEYALIAS=":your_file_alias"
export CL_PASSWORD=":your_file_password"
```

Then you can run the following to get your node ID:

```
java -jar cl-wallet.jar show-id
```
# Deploy a Metagraph

This tutorial will guide you through the process of deploying your Euclid metagraph project to a cloud provider and connecting to IntegrationNet or MainNet. We focus on AWS specifically but the basic principles would apply to any cloud provider.

**Deploying a Metagraph with Euclid**

{% hint style="warning" %}
Utilize Euclid for deploying metagraphs efficiently. Initiate deployment to your remote hosts, including all necessary files and dependencies, with the following command:

```
./scripts/hydra remote-deploy
```

To start your nodes, execute:

```
./scripts/hydra remote-start
```

For comprehensive guidance on utilizing these commands, consult the README file in the [Euclid repository](https://github.com/Constellation-Labs/euclid-development-environment/blob/main/README.md).

Additionally, we offer a demonstration video showcasing this functionality, available [here](https://twitter.com/codebrandes/status/1765904204600938505).
{% endhint %}

### Architecture[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/overview/#architecture) <a href="#architecture" id="architecture"></a>

There are many kinds of potential deployment architectures possible for production deployments depending on project scaling needs. Here, we will focus on a deployment strategy that uses a minimal set of infrastructure components to simplify deployment and reduce cloud costs. For most projects, this offers a good starting point that can be expanded on later to meet specific project needs.

We will be deploying a [Metagraph Framework](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/overview) metagraph using a [Data Application](https://docs.constellationnetwork.io/metagraph-development/metagraph-framework/data). This type of metagraph consists of 4 layers in total:

* **Global L0:** Hypergraph node on IntegrationNet or MainNet
* **Metagraph L0:** Metagraph consensus layer
* **Currency L1:** Metagraph layer for accepting and validating token transactions
* **Data L1:** Metagraph layer for accepting and validating data updates

In this guide, we will deploy all 4 layers to each of 3 EC2 instances. In other words, we will only use 3 servers but each server will act as a node on each of the 4 layers. This allows all layers to have the minimum cluster size to reach consensus (3), while also being conscious of infrastructure costs by combining each layer onto the same EC2 instances. Each layer will communicate over custom ports which we will configure as part of this process.

**Deployed Architecture:**

![Metagraph Architecture](https://docs.constellationnetwork.io/assets/images/metagraph-deployment-architecture-93f07292331cd1c25b609809e612f7bf.png)

### Requirements[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/overview/#requirements) <a href="#requirements" id="requirements"></a>

* AWS Account
* A metagraph project built and tested locally in Euclid
* At least 3 **`p12`** files. Refer to [this guide](https://docs.constellationnetwork.io/metagraph-development/guides/working-with-p12-files) on how to generate p12 files.
* Ensure that the ID of all your **`p12`** files is on the appropriate network seedlist (IntegrationNet or MainNet) otherwise, you won't be able to connect to the network. Check the [seedlist](https://constellationlabs-dag.s3.us-west-1.amazonaws.com/integrationnet-seedlist) to verify your IDs are included.

### Guide[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/overview/#guide) <a href="#guide" id="guide"></a>

This guide will walk you through a series of steps to manually configure your nodes via the AWS console. We will configure AWS, build all code on a base instance that we will then convert to an AWS AMI to be used as a template for creating the rest of the nodes. This allows us to build once, and then duplicate it to all of the EC2 instances. Then we will configure each of the nodes with their own P12 file and other details specific to each node.

**We will walk through the following steps:**

* [Configure security groups](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/security-groups): Create a security group for the nodes and open the proper network ports for communication.
* [Setup SSH keys](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/key-pairs): Create SSH keys to securely connect to the nodes.
* [Create a base instance](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/base-instance): Build a server image as an AWS AMI to be reused for each of the nodes.
* [Configure the base instance](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/base-instance/connect-to-the-instance): Add all dependencies and upload metagraph project files to the base instance.
* [Generate AMI](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/base-instance/generating-ami-image-from-base-instance): Convert the base instance into a reusable AMI.
* [Generate EC2 Instances from AMI](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/base-instance/launching-instances-from-ami): Using the AMI created in previous steps as a template, generate all 3 EC2 instances.
* [Configure Layers and Join](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/start-metagraph-instances/configuring-p12-files): Configure each of the 4 layers and join to the network.

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/guides/deploy-a-metagraph/01-overview.md)\\
# Security groups

Security groups act as virtual firewalls that control inbound and outbound traffic to your instances. Our 3 nodes will need to open up connection ports for SSH access, and for each of the 4 network layers to communicate over.

#### Create a Security Group[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/security-groups#create-a-security-group) <a href="#create-a-security-group" id="create-a-security-group"></a>

First, navigate to the **`Security Groups`** section in the Amazon [EC2 console](https://us-west-2.console.aws.amazon.com/ec2/home).

![Menu ec2](https://docs.constellationnetwork.io/assets/images/security-group-1-0364dd14dd16936812e0eda2e47c4639.png)

**Click on `Create Security Group`**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/security-groups#click-on-create-security-group)

Create a new security group and provide a name, for example `MetagraphSecurityGroup`.

**Add Inbound Rules**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/security-groups#add-inbound-rules)

Inbound rules define which ports accept inbound connections on your node. We will need to open up ports for SSH access and for each of the metagraph layers.

Click **`Add Rule`** under the **`Inbound Rules`** section and add the following rules:

| Type       | Protocol | Port Range | Source    | Purpose    |
| ---------- | -------- | ---------- | --------- | ---------- |
| SSH        | TCP      | 22         | 0.0.0.0/0 | SSH access |
| Custom TCP | TCP      | 9000-9002  | 0.0.0.0/0 | gL0 layer  |
| Custom TCP | TCP      | 9100-9102  | 0.0.0.0/0 | mL0 layer  |
| Custom TCP | TCP      | 9200-9202  | 0.0.0.0/0 | cL1 layer  |
| Custom TCP | TCP      | 9300-9302  | 0.0.0.0/0 | dL1 layer  |
# Key pairs

Key pairs are a crucial part of securing your instances. They consist of a public key that AWS stores and a private key file that you store. The private key file is used to SSH into your instances securely.

#### Use the following steps to create a keypair[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/key-pairs#use-the-following-steps-to-create-a-keypair) <a href="#use-the-following-steps-to-create-a-keypair" id="use-the-following-steps-to-create-a-keypair"></a>

Navigate to the **`Key pairs`** page on the Amazon EC2 console.

![Key pair aws](https://docs.constellationnetwork.io/assets/images/key-pair-1-8b538ec60600215ee510173cb9274227.png)

**Click on `Create key pair`**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/key-pairs#click-on-create-key-pair)

Provide a unique name for your key pair, such as: `MetagraphKeyPair`

Your screen should now look similar to this:

![Key pair aws](https://docs.constellationnetwork.io/assets/images/key-pair-2-6fff96c2778fcae5d2f53af67ea1d139.png)

After you click **`Create key pair`**, a new key pair will be generated, and your browser will automatically download a file that contains your private key.

{% hint style="warning" %}
**important**

Safeguard this file as it will be necessary for SSH access to your instances. Do not share this file or expose it publicly as it could compromise the security of your instances.

Store your keypair on your local machine in a secure location. You will need it to connect to your EC2 instances.
{% endhint %}
# Generating base instance

In this section, we will create a single EC2 instance that we will use as a template for the other two EC2 instances. This allows us to perform these tasks once and then have the output replicated to all the instances.

#### Create a Base Instance[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#create-a-base-instance) <a href="#create-a-base-instance" id="create-a-base-instance"></a>

Navigate to the **`Instances`** section on the Amazon EC2 console.

![base instance 01](https://docs.constellationnetwork.io/assets/images/base-intance-01-49a325ca0d7ac7f86fd9ebc64c9f13fd.png)

**Click on `Launch Instances`.**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#click-on-launch-instances)

Assign a name to your instance. For this guide, we will call it **`Metagraph base image`**.

**Choose an AMI**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#choose-an-ami)

In the **`Choose an Amazon Machine Image (AMI)`** section, select `Ubuntu` and then `Ubuntu server 20.04`. You should keep `64-bit (x86)`.

<figure><img src="https://docs.constellationnetwork.io/assets/images/base-intance-02-307116115eb0f444a4e882e1cacc5a39.png" alt="" width="563"><figcaption></figcaption></figure>

For the instance type, choose a model with **`4 vCPUs`** and **`16 GiB memory`**. In this case, we'll use the **`t2.xlarge`** instance type.

**Select a Key Pair**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#select-a-key-pair)

In the **`Configure Instance Details`** step, select the key pair you created earlier in the **`Key pair name`** field.

<figure><img src="https://docs.constellationnetwork.io/assets/images/base-intance-04-c0dea98ebcf98d83f6c091084f80ea80.png" alt=""><figcaption></figcaption></figure>

**Select Security Group**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#select-security-group)

In the `Network settings` section, you select the security group you created earlier.

<figure><img src="https://docs.constellationnetwork.io/assets/images/base-intance-05-8c2f23e35a5b8f83cb60273ec6e82169.png" alt="" width="563"><figcaption></figcaption></figure>

**Configure Storage**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#configure-storage)

In the `Configure storage` section, you specify the amount of storage for the instance. For this tutorial, we'll set it to **`160 GiB`**.

<figure><img src="https://docs.constellationnetwork.io/assets/images/base-intance-06-f5ba059a58d87a95fe58cfe35a97ad8d.png" alt="" width="563"><figcaption></figcaption></figure>

**Launch Instance**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/generating-base-instance#launch-instance)

Finally, press `Launch instance`. Your base instance should now be running.

You can check the status of your instance in the **`Instances`** section of the Amazon EC2 console.

<figure><img src="https://docs.constellationnetwork.io/assets/images/base-intance-07-911a523035be0cca56de430e3f094d84.png" alt=""><figcaption></figcaption></figure>
# Connect to the instance

From your **`Instances`** page, click on your instance.

Then you should see something like this:

<figure><img src="https://docs.constellationnetwork.io/assets/images/configuring-base-image-01-b6a92d9f1277fb2912b1da049ca07f38.png" alt=""><figcaption></figcaption></figure>

**Click on the `Connect` button at the top of the page.**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#click-on-the-connect-button-at-the-top-of-the-page)

There are different ways to access the instance. In this example, we will connect using `ssh` using the file downloaded in the [Key pairs](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/key-pairs) step.

**Grant privileges to the SSH key**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#grant-privileges-to-the-ssh-key)

```
chmod 400 MyKeypair.pem
```

**Use the `ssh` command to connect to your instance**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#use-the-ssh-command-to-connect-to-your-instance)

```
ssh -i "MyKeypair.pem" ubuntu@your_instance.aws-region.compute.amazonaws.com
```

The name/IP of the instance will be different, but you can get the instructions on how to connect via ssh in the **`Connect to your instance`** section of the EC2 Console.

<figure><img src="https://docs.constellationnetwork.io/assets/images/configuring-base-image-02-d46fc8e51d2bb2928d4c022a17e82dad.png" alt="" width="563"><figcaption></figcaption></figure>

If asked to confirm the fingerprint of the instance, type **`yes`**.

Once connected, you should see a screen similar to this:

<figure><img src="https://docs.constellationnetwork.io/assets/images/configuring-base-image-03-2db8329486bb524e62173cb36421b188.png" alt=""><figcaption></figcaption></figure>

### Base instance setup[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#base-instance-setup) <a href="#base-instance-setup" id="base-instance-setup"></a>

Now, you can begin setting up your instance.

**Create base directory**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#create-base-directory)

Create a directory named **`code`** and navigate into it. This will be the base directory that we will work out of.

```
mkdir code
cd code/
```

**Create layer directories**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#create-layer-directories)

Create the following directories: `global-l0`, `metagraph-l0`, `currency-l1`, and `data-l1`. These will be the root directories for each of the layers.

```
mkdir global-l0
mkdir metagraph-l0
mkdir currency-l1
mkdir data-l1
```

**Add Tessellation utilities to each directory**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#add-tessellation-utilities-to-each-directory)

Replace "v2.2.0" with the latest version of Tessellation found here: <https://github.com/Constellation-Labs/tessellation/releases>

```
cd global-l0

wget https://github.com/Constellation-Labs/tessellation/releases/download/v2.2.0/cl-node.jar
wget https://github.com/Constellation-Labs/tessellation/releases/download/v2.2.0/cl-wallet.jar
wget https://github.com/Constellation-Labs/tessellation/releases/download/v2.2.0/cl-keytool.jar

cp cl-wallet.jar metagraph-l0/cl-wallet.jar
cp cl-wallet.jar currency-l1/cl-wallet.jar
cp cl-wallet.jar data-l1/cl-wallet.jar

cp cl-keytool.jar metagraph-l0/cl-keytool.jar
cp cl-keytool.jar currency-l1/cl-keytool.jar
cp cl-keytool.jar data-l1/cl-keytool.jar
```

**Install the necessary dependencies:**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#install-the-necessary-dependencies)

```
sudo apt-get update
sudo apt install openjdk-11-jdk -y
sudo apt-get install curl -y
sudo apt-get install wget -y
sudo apt-get install gnupg -y
 
sudo echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
sudo echo "deb https://repo.scala-sbt.org/scalasbt/debian /" | sudo tee /etc/apt/sources.list.d/sbt_old.list
sudo curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | sudo apt-key add
 
sudo apt-get update
 
sudo apt-get install sbt -y
```

### Generate Metagraph JAR Files[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#generate-metagraph-jar-files) <a href="#generate-metagraph-jar-files" id="generate-metagraph-jar-files"></a>

For each of the metagraph layers, code from your project must be compiled into executable jar files. During local development with Euclid these files are compiled for you and stored within the `infra` directory of your project code. You can move these locally tested JAR files directly onto your base instance for deployment (recommended for this tutorial).

After ensuring that your project is ready for deployment, navigate to the following directory in your local Euclid codebase: `infra -> docker -> shared -> jars`

Within this directory, you will find the following JARs:

```
- `metagraph-l0.jar`
- `metagraph-l1-currency.jar`
- `metagraph-l1-data.jar`
```

Use `scp` to copy the files to your metagraph layer directories:

```
scp -i "MyKeypair.pem" your_jar_directory/metagraph-l0.jar ubuntu@ec2-your-ip.your-region.compute.amazonaws.com:code/metagraph-l0/metagraph-l0.jar
scp -i "MyKeypair.pem" your_jar_directory/metagraph-l1-currency.jar ubuntu@ec2-your-ip.your-region.compute.amazonaws.com:code/currency-l1/currency-l1.jar
scp -i "MyKeypair.pem" your_jar_directory/metagraph-l1-data.jar ubuntu@ec2-your-ip.your-region.compute.amazonaws.com:code/data-l1/data-l1.jar
```

**Alternative Option**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#alternative-option)

Alternatively, you could choose to generate the JARs on the base instance itself. If you choose that route, you can follow the steps in the following guide.

[Generating JARs on Base Instance](#generate-metagraph-jar-files)

### Setting up the Genesis File[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#setting-up-the-genesis-file) <a href="#setting-up-the-genesis-file" id="setting-up-the-genesis-file"></a>

The genesis file is a configuration file that sets initial token balances on your metagraph at launch, or genesis. This allows your project to start with any configuration of wallet balances you choose, which will only later be updated through token transactions and rewards distributions.

#### Genesis file[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#genesis-file) <a href="#genesis-file" id="genesis-file"></a>

If you already have your genesis file used for testing on Euclid, you can upload the file here.

```
scp -i "MyKeypair.pem" your_genesis_file.csv ubuntu@ec2-your-ip.your-region.compute.amazonaws.com:code/metagraph-l0/genesis.csv
```

#### Generating metagraphID[​](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#generating-metagraphid) <a href="#generating-metagraphid" id="generating-metagraphid"></a>

Before connecting your metagraph to the network, we will generate its' ID and save the output locally. This ID is a unique key used by the Global L0 store state about your metagraph.

**info**

When deploying to MainNet, your metagraphID must be added to the metagraph seedlist before you will be able to connect. Provide the metagraphID generated below to the Constellation team to be added to the seedlist.

IntegrationNet does not have a metagraph seedlist so you can connect easily and regenerate your metagraphID if needed during testing.

**Generate your metagraphID**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#generate-your-metagraphid)

```
cd ~/code/metagraph-l0

export CL_KEYSTORE=test.p12
export CL_KEYALIAS=test
export CL_PASSWORD=test
export CL_PUBLIC_HTTP_PORT=9100
export CL_P2P_HTTP_PORT=9101
export CL_CLI_HTTP_PORT=9102
export CL_GLOBAL_L0_PEER_HTTP_HOST=localhost
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_GLOBAL_L0_PEER_ID=e2f4496e5872682d7a55aa06e507a58e96b5d48a5286bfdff7ed780fa464d9e789b2760ecd840f4cb3ee6e1c1d81b2ee844c88dbebf149b1084b7313eb680714
export CL_APP_ENV=integrationnet

java -jar cl-keytool.jar generate

nohup java -jar metagraph-l0.jar create-genesis genesis.csv > metagraph-l0.log 2>&1 &

rm test.p12
```

**View Genesis Output**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#view-genesis-output)

You will find the following files in your directory:

* `genesis.snapshot`
* `genesis.address`

The `genesis.address` file contains your metagraphID, which should resemble a DAG address: `DAG...`. The `genesis.snapshot` file contains snapshot zero of your metagraph which will be used when connecting to the network for the first time.

**Your base instance is now fully configured**[**​**](https://docs.constellationnetwork.io/sdk/guides/deploy-a-metagraph/base-instance/configuring-base-instance#your-base-instance-is-now-fully-configured)

The following sections will cover creating each EC2 instance from this base instance and configuring each individually. You can skip ahead to the [Generating AMI](https://docs.constellationnetwork.io/metagraph-development/guides/deploy-a-metagraph/base-instance/generating-ami-image-from-base-instance) section.
# Generating AMI (Image) from Base Instance

Now that our base instance is configured, we can generate an AMI (Amazon Machine Image) from the instance. The AMI will allow us to create our other two EC2 instances as exact copies of the one we've already configured.

**Create the Image**

To generate the AMI, select your instance and then actions → Image and templates → Create Image

<figure><img src="https://docs.constellationnetwork.io/assets/images/generating-AMI-from-instance-01-8de4798908bdacbb8c742f2948018eca.png" alt=""><figcaption></figcaption></figure>

We can repeat the same name when configuring the image:

<figure><img src="https://docs.constellationnetwork.io/assets/images/generating-AMI-from-instance-02-ee73cc26846530499a131d3d13197b38.png" alt=""><figcaption></figcaption></figure>

**Press Create Image**

<figure><img src="https://393710127-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FxrXzGdpjkF8q1pQcgabg%2Fuploads%2F7qAa0412GFhGoBMwwmEL%2Fimage.png?alt=media&#x26;token=25cba994-4a99-498c-bc7f-75f4bcb9e6ce" alt=""><figcaption></figcaption></figure>

This step will take some time but you can follow progress on the AMIs page.

**Wait Until the Image is in Available Status**

![Generating AMI](https://docs.constellationnetwork.io/assets/images/generating-AMI-from-instance-04-ed4e6e011a53d939ef05bb813cdeea6b.png)

**Delete Base Instance**

Once the image is ready we can delete the instance used to generate the image. To do this, go back to the instances page, select the instance, and then press&#x20;
# Launching instances from AMI

The AMI created in the previous step can now be used to generate each of our 3 EC2 instances for our metagraph.

**Visit the AMI Page**

Select the AMI we created previously and press the **`Launch instance from AMI`** button.

**Configure Instance**

Name your instance, select the **`Instance Type`** as **`t2.xlarge`**, choose your **`Key pair`**, and select the appropriate **`Security Groups`**.

**Launch Instance**

Press the `Launch Instance` button.

**Repeat**

Perform the above steps 3 times to create 3 EC2 instances from the AMI.

**Connect to Instances**

Find the ip address of each instance in the EC2 dashboard and connect using your previously generated SSH key. You should be able to access all 3 instances and confirm they are properly configured.

```
ssh -i "MyKeypair.pem" ubuntu@ip.of.your.instance
```
# Configuring P12 Files

### P12 Files <a href="#p12-files" id="p12-files"></a>

P12 files contain the public/private keypair for your node to connect to the network which is protected by an alias and a password. These files are necessary for all layers to communicate with each other and validate identity of other nodes. In this step, we will move p12 files to each of the 3 nodes so that they are available when starting each layer of the network.

This guide will use just 3 p12 files in total (1 for each server instance) which is the minimal configuration. For production deployments, it is recommended that each layer and instance has its own p12 file rather than sharing between the layers.

**Transfer p12 Files**

Run the following command to transfer a p12 file to each layer's directory for a single EC2 instance.

Replace `:p12_file.p12` and `your_instance_ip` with your actual p12 file and node IP.

```
scp -i "MyKeypair.pem" :p12_file.p12 your_instance_ip:code/global-l0
scp -i "MyKeypair.pem" :p12_file.p12 your_instance_ip:code/metagraph-l0
scp -i "MyKeypair.pem" :p12_file.p12 your_instance_ip:code/currency-l1
scp -i "MyKeypair.pem" :p12_file.p12 your_instance_ip:code/data-l1
```

**Repeat this process for each of your 3 instances.**

Make sure to use a different P12 for instance when repeating the above steps.

Your P12 files will now be available on your nodes and you can move on the starting up each layer.
# Start Global L0 Instances

In the following sections, we will SSH into each of our 3 servers and configure each layer and then join it to the network. Note that both IntegrationNet and MainNet have seedlists for the Global L0 layer. Make sure your node IDs have been added to the seedlist prior to joining, otherwise you will not be allowed to join.

#### Setup Global L0 <a href="#setup-global-l0" id="setup-global-l0"></a>

#### SSH into one of your EC2 instances and move to the `global-l0` directory. <a href="#setup-global-l0" id="setup-global-l0"></a>

```
ssh -i "MyKeypair.pem" ubuntu@your_instance_ip"
cd code/global-l0
```

**Set environment variables**

Export the following environment variables, changing the values to use your p12 file's real name, alias, and password.

```
export CL_KEYSTORE=":p12_file.p12"
export CL_KEYALIAS=":p12_file_alias"
export CL_PASSWORD=":p12_password"
```

**Obtain public IP**

Obtain the public IP of your cluster by using the following command.

```
curl ifconfig.me
```

**Download the latest seedlist**

Download the latest seedlist from either IntegrationNet or MainNet.

For IntegrationNet, the seedlist is kept in an S3 bucket and can be downloaded directly.

```
wget https://constellationlabs-dag.s3.us-west-1.amazonaws.com/integrationnet-seedlist
```

For MainNet, the seedlist is stored in Github as a build asset for each release. Make sure to fill in the latest version below to get the correct seedlist.

```
wget https://github.com/Constellation-Labs/tessellation/releases/download/v2.2.1/mainnet-seedlist
```

**Start your node**

The following command will start your Global L0 node in validator mode.

```
nohup java -jar cl-node.jar run-validator --ip :instance_public_ip --public-port 9000 --p2p-port 9001 --cli-port 9002 --collateral 0 --seedlist integrationnet-seedlist -e integrationnet  > logs.log 2>&1 &
```

**Check logs**

You should see a new directory `logs` with a `app.log` file. Check the logs for any errors.

**Join the network**

Now that the node is running, we need to join it to a node on the network. You can find a node to connect to using the network load balancer at

```
https://l0-lb-integrationnet.constellationnetwork.io/node/info
```

Run the following command with the **`id`**, **`ip`**, and **`p2pPort`** parameters updated.

```
curl -v -X POST http://localhost:9002/cluster/join -H "Content-type: application/json" -d '{ "id":":integrationnet_node_id", "ip": ":integrationnet_node_ip", "p2pPort": :integrationnet_node_p2p_port }'
```

**Check connection**

Verify that your node is connected to the network with the `/node/info` endpoint on your node. It can be accessed at the following url. You should see `state: Ready` if your node has successfully connected to the network.

```
http://your_node_id:9000/node/info
```

#### Repeat <a href="#repeat" id="repeat"></a>

Repeat the above steps for each of your 3 nodes before moving on to start your metagraph layers.
# Start Metagraph L0 Instances

In this section, we will start each of our metagraph L0 instances and join them to the Global L0 network.

#### Setup Metagraph L0 <a href="#setup-metagraph-l0" id="setup-metagraph-l0"></a>

SSH into one of your EC2 instances and move to the `metagraph-l0` directory.

```
ssh -i "MyKeypair.pem" ubuntu@your_instance_ip"
cd code/metagraph-l0
```

**Set environment variables**

Export the following environment variables, changing the values to use your p12 file's real name, alias, and password.

```
export CL_KEYSTORE=":p12_file_used_on_seedlist_1.p12"
export CL_KEYALIAS=":p12_file_used_on_seedlist_1"
export CL_PASSWORD=":file_password_1"
```

Also export the following environment variables, filling in `CL_GLOBAL_L0_PEER_ID` with the public ID of your Global L0 node which can be obtained from the `/node/info` endpoint at the end of the previous step. This is also the pub ID of your p12 file.

```
export CL_PUBLIC_HTTP_PORT=9100
export CL_P2P_HTTP_PORT=9101
export CL_CLI_HTTP_PORT=9102
export CL_GLOBAL_L0_PEER_HTTP_HOST=localhost
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_GLOBAL_L0_PEER_ID=:local_global_l0_id
CL_APP_ENV=integrationnet
export CL_COLLATERAL=0
```

**Start your metagraph L0 node (genesis)**

**note**

Run this command only on the first of your instances. When you repeat these steps for the 2nd and 3rd instance, use the `run-validator` joining process below instead.

Use the following command to start the metagraph L0 process in genesis mode. This should only be done once to start your network from the genesis snapshot. In the future, to restart the network use `run-rollback` instead to restart from the most recent snapshot. Fill in the `:instance_ip` variable with the public IP address of your node.

```
nohup java -jar metagraph-l0.jar run-genesis genesis.snapshot --ip :instance_ip > metagraph-l0-logs.log 2>&1 &
```

You can check if your metagraph L0 successfully started using the `/cluster/info` endpoint or by checking logs.

```
http://:your_ip:9100/cluster/info
```

**Start your metagraph L0 node (validator)**

The 2nd and 3rd nodes should be started in validator mode and joined to the first node that was run in genesis or run-rollback mode. All other steps are the same.

```
nohup java -jar metagraph-l0.jar run-validator --ip :ip > metagraph-l0-logs.log 2>&1 &
```

Once the node is running in validator mode, we need to join it to the first node using the following command

```
curl -v -X POST http://localhost:9102/cluster/join -H "Content-type: application/json" -d '{ "id":":metagraph_node_1_id", "ip": "metagraph_node_1_ip", "p2pPort": 9101 }'
```

You can check if the nodes successfully started using the `/cluster/info` endpoint for your metagraph L0. You should see nodes appear in the list if all started properly. http\://:your\_ip:9100/cluster/info

#### Repeat <a href="#repeat" id="repeat"></a>

Repeat the above steps for each of your 3 nodes before moving on to start your metagraph L1 layers. Note that the startup commands differ between the three nodes. The first node should be started in genesis or run-rollback mode. The second and third nodes should be started in validator mode and joined to the first node.

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/guides/deploy-a-metagraph/building-metagraph-instances/02-start-metagraph-l0-instances.md)\\
# Start Currency L1 Instances

In this section, we will start each of our currency L1 instances and join them to the metagraph L0 network.

#### Setup Currency L1 <a href="#setup-currency-l1" id="setup-currency-l1"></a>

SSH into one of your EC2 instances and move to the `currency-l1` directory.

```
ssh -i "MyKeypair.pem" ubuntu@your_instance_ip"
cd code/currency-l1
```

**Set environment variables**

Export the following environment variables, changing the values to use your p12 file's real name, alias, and password.

```
export CL_KEYSTORE=":p12_file_used_on_seedlist_1.p12"
export CL_KEYALIAS=":p12_file_used_on_seedlist_1"
export CL_PASSWORD=":file_password_1"
```

Also export the following environment variables, filling in the following:

* `CL_GLOBAL_L0_PEER_ID`: The public ID of your Global L0 node which can be obtained from the `/node/info` endpoint of your Global L0 instance (<http://your\\_node\\_id:9000/node/info>).
* `CL_L0_PEER_ID`: The public ID of the metagraph l0 node which is the same as `CL_GLOBAL_L0_PEER_ID` above if you're using the same p12 files for all layers.
* `CL_GLOBAL_L0_PEER_HTTP_HOST`: The public IP of this node (points to global-l0 layer).
* `CL_L0_PEER_HTTP_HOST`: The public IP of this node (points to metagraph-l0 layer).
* `CL_L0_TOKEN_IDENTIFIER`: The metagraph ID in your address.genesis file.

```
export CL_PUBLIC_HTTP_PORT=9200
export CL_P2P_HTTP_PORT=9201
export CL_CLI_HTTP_PORT=9202
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip_from_metagraph_l0_node_1_global_l0
export CL_GLOBAL_L0_PEER_ID=:id_from_metagraph_l0_node_1_global_l0
export CL_L0_PEER_HTTP_HOST=:ip_from_metagraph_l0_node_1_metagraph_l0
export CL_L0_PEER_HTTP_PORT=9100
export CL_L0_PEER_ID=:id_from_metagraph_l0_node_1_metagraph_l0
export CL_L0_TOKEN_IDENTIFIER=:**METAGRAPH_ID**
export CL_APP_ENV=integrationnet
export CL_COLLATERAL=0
```

**Start your currency L1 node (initial)**

**note**

Run this command only on the first of your instances. When you repeat these steps for the 2nd and 3rd instance, use the `run-validator` joining process below instead.

Run the following command, filling in the public ip address of your instance.

```
nohup java -jar currency-l1.jar run-initial-validator --ip :instance_ip > metagprah-l1-logs.log 2>&1 &
```

Check if your Currency L1 successfully started: http\://:your\_ip:9200/cluster/info

**Start your currency L1 node (validator)**

The 2nd and 3rd nodes should be started in validator mode and joined to the first node that was run in initial-validator mode. All other steps are the same.

```
nohup java -jar currency-l1.jar run-validator --ip :ip > currency-l1-logs.log 2>&1 &
```

Run the following command to join, filling in the `id` and `ip` of your first currency L1 node.

```
curl -v -X POST http://localhost:9202/cluster/join -H "Content-type: application/json" -d '{ "id":":id_from_currency_l1_1", "ip": ":ip_from_currency_l1", "p2pPort": 9201 }'
```

You can check if the nodes successfully started using the `/cluster/info` endpoint for your metagraph L0. You should see nodes appear in the list if all started properly. http\://:your\_ip:9200/cluster/info

#### Repeat <a href="#repeat" id="repeat"></a>

Repeat the above steps for each of your 3 currency L1 nodes before moving on to start your data L1 layer. Note that the startup commands differ between the three nodes. The first node should be started in initial-validator mode. The second and third nodes should be started in validator mode and joined to the first node.

[Edit this page](https://github.com/Constellation-Labs/documentation-hub/edit/main/sdk/guides/deploy-a-metagraph/building-metagraph-instances/03-start-currency-l1-instances.md)\\
# Start Data L1 Instances

In this section, we will start each of our data L1 instances and join them to the metagraph L0 network.

#### Setup Data L1 <a href="#setup-data-l1" id="setup-data-l1"></a>

SSH into one of your EC2 instances and move to the `data-l1` directory.

```
ssh -i "MyKeypair.pem" ubuntu@your_instance_ip"
cd code/data-l1
```

**Set environment variables**

Export the following environment variables, changing the values to use your p12 file's real name, alias, and password.

```
export CL_KEYSTORE=":p12_file_used_on_seedlist_1.p12"
export CL_KEYALIAS=":p12_file_used_on_seedlist_1"
export CL_PASSWORD=":file_password_1"
```

Also export the following environment variables, filling in the following:

* `CL_GLOBAL_L0_PEER_ID`: The public ID of your Global L0 node which can be obtained from the `/node/info` endpoint of your Global L0 instance (<http://your\\_node\\_id:9000/node/info>).
* `CL_L0_PEER_ID`: The public ID of the metagraph l0 node which is the same as `CL_GLOBAL_L0_PEER_ID` above if you're using the same p12 files for all layers.
* `CL_GLOBAL_L0_PEER_HTTP_HOST`: The public IP of this node (points to global-l0 layer).
* `CL_L0_PEER_HTTP_HOST`: The public IP of this node (points to metagraph-l0 layer).
* `CL_L0_TOKEN_IDENTIFIER`: The metagraph ID in your address.genesis file.

```
export CL_PUBLIC_HTTP_PORT=9300
export CL_P2P_HTTP_PORT=9301
export CL_CLI_HTTP_PORT=9302
export CL_GLOBAL_L0_PEER_HTTP_HOST=:ip_from_metagraph_l0_node_1_global_l0
export CL_GLOBAL_L0_PEER_HTTP_PORT=9000
export CL_GLOBAL_L0_PEER_ID=:id_from_metagraph_l0_node_1_global_l0
export CL_L0_PEER_HTTP_HOST=:ip_from_metagraph_l0_node_1_metagraph_l0
export CL_L0_PEER_HTTP_PORT=9100
export CL_L0_PEER_ID=:id_from_metagraph_l0_node_1_metagraph_l0
export CL_L0_TOKEN_IDENTIFIER=:**METAGRAPH_ID**
export CL_APP_ENV=integrationnet
export CL_COLLATERAL=0
```

**Start your data L1 node (initial)**

**note**

Run this command only on the first of your instances. When you repeat these steps for the 2nd and 3rd instance, use the `run-validator` joining process below instead.

Run the following command, filling in the public ip address of your instance.

```
nohup java -jar data-l1.jar run-initial-validator --ip :instance_ip > metagprah-l1-logs.log 2>&1 &
```

Check if your data L1 node successfully started: http\://:your\_ip:9300/cluster/info

**Start your data L1 node (validator)**

The 2nd and 3rd nodes should be started in validator mode and joined to the first node that was run in initial-validator mode. All other steps are the same.

```
nohup java -jar data-l1.jar run-validator --ip :ip > data-l1-logs.log 2>&1 &
```

Run the following command to join, filling in the `id` and `ip` of your first data L1 node.

```
curl -v -X POST http://localhost:9302/cluster/join -H "Content-type: application/json" -d '{ "id":":id_from_data_l1_1", "ip": ":ip_from_data_l1", "p2pPort": 9301 }'
```

#### Repeat <a href="#repeat" id="repeat"></a>

Repeat the above steps for each of your 3 data L1 nodes before moving on to start your data L1 layer. Note that the startup commands differ between the three nodes. The first node should be started in initial-validator mode. The second and third nodes should be started in validator mode and joined to the first node.

### Verify <a href="#verify" id="verify"></a>

If you followed all steps, your metagraph is now fully deployed.

You can check the status of each of the node layers using their IP address and layer port number.

**Ports**

* Global L0: 9000
* Metagraph L0: 9100
* Currency L1: 9200
* Data L1: 9300

**Endpoints**

* `/cluster/info`: View nodes joined to the current layer's cluster
* `/node/info`: View info about a specific node and its status
# Example Codebases

## Example Codebases

The Euclid SDK is designed to provide developers with the tools they need to build robust and scalable decentralized applications on the Constellation Network. To help you get started, we have curated a list of exemplary codebases that you can explore and learn from. These codebases are open-source projects that demonstrate various aspects of using the Euclid SDK in real-world scenarios.

### Codebases[​](https://docs.constellationnetwork.io/sdk/resources/example-codebases#codebases) <a href="#codebases" id="codebases"></a>

<table data-card-size="large" data-view="cards" data-full-width="true"><thead><tr><th></th><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th><th data-hidden data-card-cover data-type="files"></th></tr></thead><tbody><tr><td><strong>Metagraph Examples</strong></td><td>The Metagraph Examples repository contains several minimalist metagraph codebases designed to demonstrate specific metagraph features in a simplified context. All projects in this repo can be installed with <code>hydra install-template</code></td><td><strong>Displays:</strong> many concepts.</td><td><a href="https://github.com/Constellation-Labs/metagraph-examples">https://github.com/Constellation-Labs/metagraph-examples</a></td><td><a href="https://393710127-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FxrXzGdpjkF8q1pQcgabg%2Fuploads%2FM7RiRUvHXoc2Kw5J95FZ%2Fmsedge_v7yXuo4J3Z.png?alt=media&#x26;token=e849f3c5-26da-4329-be2e-e261f2163976">msedge_v7yXuo4J3Z.png</a></td></tr><tr><td><strong>Dor Metagraph</strong></td><td>This repository is the codebase of the Dor Metagraph, the first metagraph to launch to MainNet. The Dor Metagraph ingests foot traffic data from a network of IoT sensors.</td><td><strong>Displays:</strong> strategies for processing binary data types using decoders, reward distribution, and separation of public/private data using calculated state.</td><td><a href="https://github.com/Constellation-Labs/dor-metagraph">https://github.com/Constellation-Labs/dor-metagraph</a></td><td><a href="https://393710127-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FxrXzGdpjkF8q1pQcgabg%2Fuploads%2FyUaJH8sWqzrXMFis9zwo%2Fmsedge_lJxQAuU1qz.png?alt=media&#x26;token=afd69ce7-3dbd-4ae5-bb07-263a179e853d">msedge_lJxQAuU1qz.png</a></td></tr><tr><td><strong>EL PACA Metagraph</strong></td><td>This repository is the codebase of the EL PACA Metagraph, a social credit metagraph designed to track and reward community activity within the Constellation ecosystem.</td><td><strong>Displays:</strong> data fetching using daemons, integration with 3rd party APIs, and reward distribution</td><td><a href="https://github.com/Constellation-Labs/elpaca-metagraph">https://github.com/Constellation-Labs/elpaca-metagraph</a></td><td><a href="https://393710127-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FxrXzGdpjkF8q1pQcgabg%2Fuploads%2FCy0aIw54wbfV67EIB9F0%2F0_WvduXV4zjh8PsjGm.webp?alt=media&#x26;token=612dde25-34ef-44a5-9c0d-29ee963021af">0_WvduXV4zjh8PsjGm.webp</a></td></tr></tbody></table>
