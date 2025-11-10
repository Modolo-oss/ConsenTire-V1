/**
 * El Paca Governance Module
 * Token-governed privacy policy voting system
 */

package consentire

import scala.util.{Try, Success, Failure}

/**
 * Privacy proposal
 */
case class PrivacyProposal(
  proposalId: String,
  title: String,
  description: String,
  proposedChanges: PolicyChange,
  creatorSignature: Signature,
  votingDeadline: Long,
  createdAt: Long
)

/**
 * Policy change
 */
case class PolicyChange(
  field: String,
  oldValue: String,
  newValue: String,
  justification: String
)

/**
 * Vote record
 */
case class VoteRecord(
  voter: String,
  proposalId: String,
  choice: VoteChoice,
  votingPower: Long,
  timestamp: Long
)

/**
 * Vote choice
 */
sealed trait VoteChoice
object VoteChoice {
  case object For extends VoteChoice
  case object Against extends VoteChoice
  case object Abstain extends VoteChoice
}

/**
 * Vote result/tally
 */
case class VoteResult(
  proposalId: String,
  forVotes: Long,
  againstVotes: Long,
  abstainVotes: Long,
  totalPower: Long,
  participation: Double // Percentage
)

/**
 * El Paca Governance
 */
object ElPacaGovernance {
  
  private val MIN_GOVERNANCE_TOKENS = 100L
  private val MIN_PARTICIPATION = 0.1 // 10%
  private val VOTING_DURATION = 7 * 24 * 60 * 60 * 1000L // 7 days
  
  // In-memory storage
  private var proposalStore: Map[String, PrivacyProposal] = Map.empty
  private var voteStore: Map[String, Seq[VoteRecord]] = Map.empty
  private var tokenBalances: Map[String, Long] = Map.empty
  
  /**
   * Submit policy proposal
   */
  def submitPolicyProposal(
    creator: String,
    proposal: PrivacyProposal
  ): Result[String] = {
    // Verify El Paca token balance
    val tokenBalance = getElPacaBalance(creator)
    if (tokenBalance < MIN_GOVERNANCE_TOKENS) {
      return Result.failure("Insufficient El Paca tokens for governance")
    }
    
    // Generate proposal ID
    val proposalId = generateProposalId(proposal)
    
    // Create proposal with metadata
    val fullProposal = proposal.copy(
      proposalId = proposalId,
      votingDeadline = System.currentTimeMillis() + VOTING_DURATION,
      createdAt = System.currentTimeMillis()
    )
    
    // Store proposal
    proposalStore = proposalStore + (proposalId -> fullProposal)
    voteStore = voteStore + (proposalId -> Seq.empty)
    
    Result.success(proposalId)
  }
  
  /**
   * Cast vote on proposal
   */
  def castVote(
    voter: String,
    proposalId: String,
    choice: VoteChoice
  ): Result[VoteRecord] = {
    proposalStore.get(proposalId) match {
      case Some(proposal) =>
        // Check if voting deadline has passed
        if (System.currentTimeMillis() > proposal.votingDeadline) {
          return Result.failure("Voting deadline has passed")
        }
        
        // Calculate voting power (El Paca tokens + staking)
        val votingPower = calculateVotingPower(voter)
        
        // Create vote record
        val voteRecord = VoteRecord(
          voter = voter,
          proposalId = proposalId,
          choice = choice,
          votingPower = votingPower,
          timestamp = System.currentTimeMillis()
        )
        
        // Store vote (remove existing vote from same voter)
        val existingVotes = voteStore.getOrElse(proposalId, Seq.empty)
        val updatedVotes = existingVotes.filter(_.voter != voter) :+ voteRecord
        voteStore = voteStore + (proposalId -> updatedVotes)
        
        Result.success(voteRecord)
      case None =>
        Result.failure("Proposal not found")
    }
  }
  
  /**
   * Execute proposal if passed
   */
  def executeProposal(proposalId: String): Result[String] = {
    proposalStore.get(proposalId) match {
      case Some(proposal) =>
        val tally = getProposalTally(proposalId)
        
        if (tally.participation >= MIN_PARTICIPATION && tally.forVotes > tally.againstVotes) {
          // Execute policy changes
          applyPolicyChanges(proposal.proposedChanges)
          
          // Anchor decision to HGTP
          val decisionAnchor = anchorDecisionToHGTP(proposalId, tally)
          
          Result.success(decisionAnchor)
        } else {
          Result.failure("Proposal did not pass voting threshold")
        }
      case None =>
        Result.failure("Proposal not found")
    }
  }
  
  /**
   * Get proposal tally
   */
  def getProposalTally(proposalId: String): VoteResult = {
    val votes = voteStore.getOrElse(proposalId, Seq.empty)
    val totalPower = votes.map(_.votingPower).sum
    
    VoteResult(
      proposalId = proposalId,
      forVotes = votes.filter(_.choice == VoteChoice.For).map(_.votingPower).sum,
      againstVotes = votes.filter(_.choice == VoteChoice.Against).map(_.votingPower).sum,
      abstainVotes = votes.filter(_.choice == VoteChoice.Abstain).map(_.votingPower).sum,
      totalPower = totalPower,
      participation = votes.length.toDouble / tokenBalances.size // Simplified participation metric
    )
  }
  
  /**
   * Get El Paca balance
   */
  def getElPacaBalance(userId: String): Long = {
    tokenBalances.getOrElse(userId, 0L)
  }
  
  /**
   * Set El Paca balance (for testing/demo)
   */
  def setElPacaBalance(userId: String, balance: Long): Unit = {
    tokenBalances = tokenBalances + (userId -> balance)
  }
  
  // Helper methods
  
  private def generateProposalId(proposal: PrivacyProposal): String = {
    import java.security.MessageDigest
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(proposal.title.getBytes("UTF-8"))
    hashBytes.map("%02x".format(_)).mkString.substring(0, 16)
  }
  
  private def calculateVotingPower(voter: String): Long = {
    val balance = getElPacaBalance(voter)
    // TODO: Add staking multiplier
    balance
  }
  
  private def applyPolicyChanges(changes: PolicyChange): Unit = {
    // TODO: Apply policy changes to consent engine
    println(s"Applying policy change: ${changes.field} = ${changes.newValue}")
  }
  
  private def anchorDecisionToHGTP(proposalId: String, tally: VoteResult): String = {
    // TODO: Anchor governance decision to HGTP
    import java.security.MessageDigest
    val digest = MessageDigest.getInstance("SHA-256")
    val input = s"$proposalId:${tally.forVotes}:${tally.againstVotes}"
    val hashBytes = digest.digest(input.getBytes("UTF-8"))
    hashBytes.map("%02x".format(_)).mkString
  }
}
