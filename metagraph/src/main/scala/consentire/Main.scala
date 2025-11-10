package consentire

import cats.effect.{Async, IO}
import cats.syntax.all._
import org.tessellation.BuildInfo
import org.tessellation.currency.dataApplication.BaseDataApplicationL0Service
import org.tessellation.currency.l0.CurrencyL0App
import org.tessellation.currency.schema.currency._
import org.tessellation.schema.address.Address
import org.tessellation.schema.balance.Balance
import org.tessellation.schema.cluster.ClusterId
import org.tessellation.schema.transaction.{RewardTransaction, TransactionAmount}
import org.tessellation.sdk.domain.rewards.Rewards
import org.tessellation.sdk.infrastructure.consensus.trigger.ConsensusTrigger
import org.tessellation.security.SecurityProvider
import org.tessellation.security.signature.Signed
import eu.timepit.refined.auto._
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

import java.util.UUID
import scala.collection.immutable.{SortedMap, SortedSet}

/**
 * ConsenTide Data Application for GDPR Consent Management
 */
class ConsenTideDataApplication extends BaseDataApplicationL0Service[IO] {
  
  // Data types for ConsenTide
  case class ConsentUpdate(
    consentId: String,
    controllerId: String,
    purpose: String,
    dataCategories: List[String],
    lawfulBasis: String,
    action: String, // "grant", "revoke", "update"
    userSignature: String,
    timestamp: Long
  )
  
  case class ConsenTideOnChainState(
    updates: List[ConsentUpdate]
  )
  
  case class ConsenTideCalculatedState(
    activeConsents: Map[String, ConsentRecord],
    revokedConsents: Map[String, ConsentRecord],
    complianceMetrics: ComplianceMetrics
  )
  
  case class ConsentRecord(
    consentId: String,
    controllerHash: String,
    purposeHash: String,
    status: String,
    grantedAt: Long,
    expiresAt: Option[Long],
    userId: String
  )
  
  case class ComplianceMetrics(
    totalConsents: Int,
    activeConsents: Int,
    revokedConsents: Int,
    complianceScore: Double
  )
  
  // Circe encoders/decoders
  implicit val consentUpdateEncoder: Encoder[ConsentUpdate] = deriveEncoder
  implicit val consentUpdateDecoder: Decoder[ConsentUpdate] = deriveDecoder
  
  implicit val consentRecordEncoder: Encoder[ConsentRecord] = deriveEncoder
  implicit val consentRecordDecoder: Decoder[ConsentRecord] = deriveDecoder
  
  implicit val complianceMetricsEncoder: Encoder[ComplianceMetrics] = deriveEncoder
  implicit val complianceMetricsDecoder: Decoder[ComplianceMetrics] = deriveDecoder
  
  implicit val onChainStateEncoder: Encoder[ConsenTideOnChainState] = deriveEncoder
  implicit val onChainStateDecoder: Decoder[ConsenTideOnChainState] = deriveDecoder
  
  implicit val calculatedStateEncoder: Encoder[ConsenTideCalculatedState] = deriveEncoder
  implicit val calculatedStateDecoder: Decoder[ConsenTideCalculatedState] = deriveDecoder
  
  // Genesis state
  override def genesis: DataState[ConsenTideOnChainState, ConsenTideCalculatedState] = {
    DataState(
      ConsenTideOnChainState(List.empty),
      ConsenTideCalculatedState(
        activeConsents = Map.empty,
        revokedConsents = Map.empty,
        complianceMetrics = ComplianceMetrics(0, 0, 0, 100.0)
      )
    )
  }
  
  // Validate update (L1 validation)
  override def validateUpdate(update: ConsentUpdate): IO[DataApplicationValidationErrorOr[Unit]] = IO {
    // Basic validation
    if (update.consentId.isEmpty || update.controllerId.isEmpty || update.purpose.isEmpty) {
      DataApplicationValidationError.invalidNec
    } else if (!List("grant", "revoke", "update").contains(update.action)) {
      DataApplicationValidationError.invalidNec
    } else {
      ().validNec
    }
  }
  
  // Validate data (L0 validation with state access)
  override def validateData(
    oldState: DataState[ConsenTideOnChainState, ConsenTideCalculatedState],
    updates: NonEmptyList[Signed[ConsentUpdate]]
  ): IO[DataApplicationValidationErrorOr[Unit]] = IO {
    // State-based validation
    val calculatedState = oldState.calculated
    
    updates.toList.map(_.value).map { update =>
      update.action match {
        case "grant" =>
          // Check if consent already exists
          if (calculatedState.activeConsents.contains(update.consentId)) {
            DataApplicationValidationError.invalidNec
          } else {
            ().validNec
          }
        case "revoke" =>
          // Check if consent exists and is active
          if (!calculatedState.activeConsents.contains(update.consentId)) {
            DataApplicationValidationError.invalidNec
          } else {
            ().validNec
          }
        case _ => ().validNec
      }
    }.reduce
  }
  
  // Combine function (state transitions)
  override def combine(
    oldState: DataState[ConsenTideOnChainState, ConsenTideCalculatedState],
    updates: NonEmptyList[Signed[ConsentUpdate]]
  ): IO[DataState[ConsenTideOnChainState, ConsenTideCalculatedState]] = IO {
    
    val newOnChainState = ConsenTideOnChainState(
      oldState.onChain.updates ++ updates.toList.map(_.value)
    )
    
    val newCalculatedState = updates.toList.foldLeft(oldState.calculated) { (state, signedUpdate) =>
      val update = signedUpdate.value
      
      update.action match {
        case "grant" =>
          val consentRecord = ConsentRecord(
            consentId = update.consentId,
            controllerHash = hash(update.controllerId),
            purposeHash = hash(update.purpose),
            status = "granted",
            grantedAt = update.timestamp,
            expiresAt = None,
            userId = hash(update.userSignature)
          )
          
          state.copy(
            activeConsents = state.activeConsents + (update.consentId -> consentRecord),
            complianceMetrics = updateComplianceMetrics(state.complianceMetrics, "grant")
          )
          
        case "revoke" =>
          state.activeConsents.get(update.consentId) match {
            case Some(consent) =>
              val revokedConsent = consent.copy(status = "revoked")
              state.copy(
                activeConsents = state.activeConsents - update.consentId,
                revokedConsents = state.revokedConsents + (update.consentId -> revokedConsent),
                complianceMetrics = updateComplianceMetrics(state.complianceMetrics, "revoke")
              )
            case None => state
          }
          
        case _ => state
      }
    }
    
    DataState(newOnChainState, newCalculatedState)
  }
  
  // Helper methods
  private def hash(input: String): String = {
    import java.security.MessageDigest
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(input.getBytes("UTF-8"))
    hashBytes.map("%02x".format(_)).mkString
  }
  
  private def updateComplianceMetrics(
    metrics: ComplianceMetrics,
    action: String
  ): ComplianceMetrics = {
    action match {
      case "grant" =>
        val newActive = metrics.activeConsents + 1
        val newTotal = metrics.totalConsents + 1
        metrics.copy(
          totalConsents = newTotal,
          activeConsents = newActive,
          complianceScore = calculateComplianceScore(newActive, metrics.revokedConsents)
        )
      case "revoke" =>
        val newActive = metrics.activeConsents - 1
        val newRevoked = metrics.revokedConsents + 1
        metrics.copy(
          activeConsents = newActive,
          revokedConsents = newRevoked,
          complianceScore = calculateComplianceScore(newActive, newRevoked)
        )
      case _ => metrics
    }
  }
  
  private def calculateComplianceScore(active: Int, revoked: Int): Double = {
    val total = active + revoked
    if (total == 0) 100.0
    else (active.toDouble / total.toDouble) * 100.0
  }
}

/**
 * El Paca Rewards for ConsenTide governance
 */
object ConsenTideRewards {
  def make[F[_]: Async] = new Rewards[
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
    ): F[SortedSet[RewardTransaction]] = {
      
      // Reward governance participants
      val governanceRewards = SortedSet(
        // Treasury for governance
        Address("DAG8pkb7EhCkT3yU87B2yPBunSCPnEdmX2Wv24sZ"),
        // Community rewards
        Address("DAG4o41NzhfX6DyYBTTXu6sJa6awm36abJpv89jB")
      ).map(RewardTransaction(_, TransactionAmount(1000_0000L))) // 10 El Paca tokens
      
      governanceRewards.pure[F]
    }
  }
}

/**
 * Main ConsenTide L0 Application
 */
object Main extends CurrencyL0App(
  "ConsenTide",
  "GDPR Consent Management Metagraph",
  ClusterId(UUID.fromString("517c3a05-9219-471b-a54c-21b7d72f4ae5")),
  version = BuildInfo.version
) {
  
  def dataApplication: Option[BaseDataApplicationL0Service[IO]] = Some(
    new ConsenTideDataApplication()
  )
  
  def rewards(implicit sp: SecurityProvider[IO]) = Some(
    ConsenTideRewards.make[IO]
  )
}