/**
 * Core types for ConsenTide Metagraph
 */

package consentire

import scala.util.{Try, Success, Failure}

/**
 * Legal basis for data processing (GDPR Article 6)
 */
sealed trait LegalBasis
object LegalBasis {
  case object Consent extends LegalBasis
  case object Contract extends LegalBasis
  case object LegalObligation extends LegalBasis
  case object VitalInterests extends LegalBasis
  case object PublicTask extends LegalBasis
  case object LegitimateInterests extends LegalBasis
}

/**
 * Consent status
 */
sealed trait ConsentStatus
object ConsentStatus {
  case object Granted extends ConsentStatus
  case object Revoked extends ConsentStatus
  case object Expired extends ConsentStatus
  case object Pending extends ConsentStatus
}

/**
 * Consent state for Metagraph
 */
case class ConsentState(
  consentId: String,
  controllerHash: String,
  purposeHash: String,
  status: ConsentStatus,
  grantedAt: Long,
  expiresAt: Option[Long],
  hgtpTxHash: String,
  userId: String // Hashed user identifier
)

/**
 * Consent grant request
 */
case class ConsentGrantRequest(
  userSignature: Signature,
  controllerId: String,
  purpose: String,
  dataCategories: Seq[String],
  lawfulBasis: LegalBasis,
  expiresAt: Option[Long]
)

/**
 * ZK verification result
 */
case class ZKVerificationResult(
  isValid: Boolean,
  consentId: String,
  proof: ZKProof,
  hgtpMerkleProof: MerkleProof
)

/**
 * Zero-knowledge proof
 */
case class ZKProof(
  proof: String,
  publicSignals: Seq[String],
  circuitHash: String
)

/**
 * Merkle proof for HGTP
 */
case class MerkleProof(
  root: String,
  path: Seq[String],
  leaf: String,
  verified: Boolean
)

/**
 * Signature (placeholder - implement actual signature type)
 */
case class Signature(
  id: String,
  publicKey: String,
  signature: String
)

/**
 * Result type for operations
 */
sealed trait Result[+T] {
  def isSuccess: Boolean
  def isFailure: Boolean
  def get: T
  def getOrElse[U >: T](default: => U): U
}

case class Success[T](value: T) extends Result[T] {
  def isSuccess = true
  def isFailure = false
  def get = value
  def getOrElse[U >: T](default: => U): U = value
}

case class Failure(message: String) extends Result[Nothing] {
  def isSuccess = false
  def isFailure = true
  def get = throw new NoSuchElementException(message)
  def getOrElse[U](default: => U): U = default
}

object Result {
  def success[T](value: T): Result[T] = Success(value)
  def failure(message: String): Result[Nothing] = Failure(message)
  
  implicit def fromTry[T](t: Try[T]): Result[T] = t match {
    case scala.util.Success(value) => Success(value)
    case scala.util.Failure(error) => Failure(error.getMessage)
  }
}
