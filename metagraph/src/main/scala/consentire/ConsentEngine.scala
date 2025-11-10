/**
 * ConsenTide Consent Engine - Metagraph implementation
 * 
 * Core consent state machine for managing GDPR consent lifecycle
 */

package consentire

import java.security.MessageDigest
import scala.util.{Try, Success, Failure}

/**
 * Consent Engine - L0 App (placeholder structure)
 * TODO: Extend actual L0App when Constellation SDK is available
 */
object ConsentEngine {
  
  // In-memory storage (replace with persistent storage in production)
  private var consentStore: Map[String, ConsentState] = Map.empty
  
  /**
   * Validate and grant consent
   */
  def grantConsent(request: ConsentGrantRequest): Result[ConsentState] = {
    try {
      // 1. Verify user signature
      if (!verifySignature(request.userSignature, getUserPublicKey(request.userSignature.id))) {
        return Result.failure("Invalid user signature")
      }
      
      // 2. Generate ZK proof of eligibility
      val zkProof = generateEligibilityProof(request.userSignature.id, request.controllerId)
      
      // 3. Create consent record
      val consentId = generateConsentId(
        request.userSignature.id,
        request.controllerId,
        request.purpose
      )
      
      val controllerHash = hash(request.controllerId)
      val purposeHash = hash(request.purpose)
      
      val consent = ConsentState(
        consentId = consentId,
        controllerHash = controllerHash,
        purposeHash = purposeHash,
        status = ConsentStatus.Granted,
        grantedAt = System.currentTimeMillis(),
        expiresAt = request.expiresAt.orElse(calculateExpiry(request.lawfulBasis)),
        hgtpTxHash = "", // Will be filled after HGTP anchoring
        userId = hash(request.userSignature.id)
      )
      
      // 4. Store consent
      consentStore = consentStore + (consentId -> consent)
      
      Result.success(consent)
    } catch {
      case e: Exception => Result.failure(e.getMessage)
    }
  }
  
  /**
   * ZK consent verification (no personal data exposure)
   */
  def verifyConsent(
    consentId: String,
    requestedPurpose: String
  ): Result[ZKVerificationResult] = {
    consentStore.get(consentId) match {
      case Some(consentRecord) =>
        // Verify purpose match
        if (hash(requestedPurpose) != consentRecord.purposeHash) {
          return Result.failure("Purpose mismatch")
        }
        
        // Verify temporal constraints
        val now = System.currentTimeMillis()
        consentRecord.expiresAt match {
          case Some(expiry) if now > expiry =>
            return Result.failure("Consent expired")
          case _ => // Valid
        }
        
        // Verify status
        if (consentRecord.status != ConsentStatus.Granted) {
          return Result.failure(s"Consent is ${consentRecord.status}")
        }
        
        // Generate ZK proof (no personal data)
        val zkProof = generateZKProof(consentRecord)
        val merkleProof = generateMerkleProof(consentRecord)
        
        Result.success(
          ZKVerificationResult(
            isValid = true,
            consentId = consentId,
            proof = zkProof,
            hgtpMerkleProof = merkleProof
          )
        )
      case None =>
        Result.failure("Consent not found")
    }
  }
  
  /**
   * Revoke consent
   */
  def revokeConsent(consentId: String, userSignature: Signature): Result[ConsentState] = {
    consentStore.get(consentId) match {
      case Some(consent) =>
        // Verify user owns this consent
        if (hash(userSignature.id) != consent.userId) {
          return Result.failure("User does not own this consent")
        }
        
        // Update status
        val updatedConsent = consent.copy(status = ConsentStatus.Revoked)
        consentStore = consentStore + (consentId -> updatedConsent)
        
        Result.success(updatedConsent)
      case None =>
        Result.failure("Consent not found")
    }
  }
  
  /**
   * Get consent by ID
   */
  def getConsent(consentId: String): Option[ConsentState] = {
    consentStore.get(consentId)
  }
  
  /**
   * Get active consents for user
   */
  def getActiveConsents(userId: String): Seq[ConsentState] = {
    val userHash = hash(userId)
    consentStore.values
      .filter(consent => consent.userId == userHash && consent.status == ConsentStatus.Granted)
      .toSeq
  }
  
  // Helper methods
  
  private def generateConsentId(userId: String, controllerId: String, purpose: String): String = {
    val timestamp = System.currentTimeMillis()
    val input = s"$userId:$controllerId:$purpose:$timestamp"
    hash(input)
  }
  
  private def hash(input: String): String = {
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(input.getBytes("UTF-8"))
    hashBytes.map("%02x".format(_)).mkString
  }
  
  private def verifySignature(signature: Signature, publicKey: String): Boolean = {
    // TODO: Implement actual signature verification
    signature.signature.nonEmpty && publicKey.nonEmpty
  }
  
  private def getUserPublicKey(userId: String): String = {
    // TODO: Retrieve from key store
    s"pk_$userId"
  }
  
  private def generateEligibilityProof(userId: String, controllerId: String): ZKProof = {
    // TODO: Implement actual ZK proof generation using Circom/snarkJS
    // This is a placeholder
    ZKProof(
      proof = "simulated_proof",
      publicSignals = Seq(hash(controllerId)),
      circuitHash = hash("eligibility-circuit")
    )
  }
  
  private def generateZKProof(consentRecord: ConsentState): ZKProof = {
    // TODO: Implement actual ZK proof generation
    ZKProof(
      proof = "simulated_verification_proof",
      publicSignals = Seq(
        consentRecord.controllerHash,
        consentRecord.purposeHash,
        consentRecord.status.toString
      ),
      circuitHash = hash("verification-circuit")
    )
  }
  
  private def generateMerkleProof(consentRecord: ConsentState): MerkleProof = {
    // TODO: Generate actual merkle proof from HGTP
    MerkleProof(
      root = hash("merkle_root"),
      path = Seq.empty,
      leaf = consentRecord.hgtpTxHash,
      verified = true
    )
  }
  
  private def calculateExpiry(lawfulBasis: LegalBasis): Option[Long] = {
    val oneYear = 365L * 24 * 60 * 60 * 1000
    lawfulBasis match {
      case LegalBasis.Consent => Some(System.currentTimeMillis() + oneYear)
      case LegalBasis.Contract => Some(System.currentTimeMillis() + 2 * oneYear)
      case _ => None // No expiration for other bases
    }
  }
}
