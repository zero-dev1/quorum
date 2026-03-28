import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useVoteAction } from '../hooks/useVoteAction';
import { ConfirmationModal } from './ConfirmationModal';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

interface VotingCardProps {
  pollId: bigint;
  options: string[];
  question: string;
  isEligible: boolean;
  eligibilityReason: string;
  onVoteSuccess: () => void;
}

export function VotingCard({
  pollId,
  options,
  question,
  isEligible,
  eligibilityReason,
  onVoteSuccess,
}: VotingCardProps) {
  const { isConnected, connect } = useWallet();
  const { castVote, isLoading: isVoting } = useVoteAction();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'submitting' | 'confirming' | 'success' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    setError(null);
  };

  const handleCastVote = () => {
    if (selectedOption !== null) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmVote = async () => {
  if (selectedOption === null) return;

  setConfirmStatus('submitting');
  setConfirmError(null);

  // Brief pause to let the user see "Submitting..." state
  await new Promise(r => setTimeout(r, 600));
  setConfirmStatus('confirming');

  try {
    const result = await castVote(pollId, selectedOption);

    if (result.success) {
      setConfirmStatus('success');
      setTxHash(result.hash || null);
      // Hold the success state for 1.5s so user sees the checkmark
      await new Promise(r => setTimeout(r, 1500));
      setShowConfirmation(false);
      setConfirmStatus('idle');
      setHasVoted(true);
      onVoteSuccess();
    } else {
      setConfirmStatus('error');
      setConfirmError('Transaction failed. Please try again.');
    }
  } catch (err: any) {
    setConfirmStatus('error');
    setConfirmError(err?.message || 'Transaction failed. Please try again.');
  }
};

  if (!isConnected) {
    return (
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '24px',
        }}
      >
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: COLORS.textSecondary,
            margin: '0 0 16px 0',
          }}
        >
          Connect your wallet to vote
        </p>
        <button
          onClick={connect}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.primary}`,
            color: COLORS.primary,
            fontFamily: FONTS.body,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.primary;
            e.currentTarget.style.color = COLORS.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = COLORS.primary;
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '24px',
        }}
      >
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: COLORS.textSecondary,
            margin: '0 0 8px 0',
          }}
        >
          You are not eligible for this poll
        </p>
        <p
          style={{
            fontFamily: FONTS.mono,
            fontSize: '13px',
            color: COLORS.textMuted,
            margin: 0,
          }}
        >
          {eligibilityReason}
        </p>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: COLORS.primary,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: COLORS.textPrimary,
          }}
        >
          You voted for &quot;{options[selectedOption || 0]}&quot;
        </span>
        {txHash && (
          <a
            href={`https://explorer.qfnode.net/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.primary,
              textDecoration: 'none',
            }}
          >
            Tx: {txHash.slice(0, 10)}...
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          padding: '24px',
        }}
      >
        <h3
          style={{
            fontFamily: FONTS.body,
            fontSize: '18px',
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: '0 0 24px 0',
          }}
        >
          Cast Your Vote
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {options.map((option, index) => (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={index}
              onClick={() => handleOptionSelect(index)}
              whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
              animate={{
                opacity: selectedOption !== null && selectedOption !== index ? 0.5 : 1,
                borderColor: selectedOption === index ? COLORS.primary : COLORS.border,
              }}
              transition={{ duration: 0.15 }}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '48px',
                backgroundColor: selectedOption === index ? 'rgba(99, 102, 241, 0.12)' : COLORS.background,
                border: `1px solid ${COLORS.border}`,
                borderLeft: selectedOption === index ? `3px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: FONTS.body,
                fontSize: '15px',
                fontWeight: selectedOption === index ? 600 : 400,
                color: COLORS.textPrimary,
              }}
            >
              {option}
              {selectedOption === index && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ width: 6, height: 6, backgroundColor: COLORS.primary }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {error && (
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '13px',
              color: COLORS.error,
              margin: '16px 0 0 0',
            }}
          >
            {error}
          </p>
        )}

        <AnimatePresence>
          {selectedOption !== null && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={handleCastVote}
              disabled={isVoting}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor: COLORS.primary,
                border: 'none',
                color: '#FFF',
                fontFamily: FONTS.body,
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cast Vote
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        title="Confirm Your Vote"
        onCancel={() => {
          if (confirmStatus === 'idle' || confirmStatus === 'error') {
            setShowConfirmation(false);
            setConfirmStatus('idle');
            setConfirmError(null);
          }
        }}
        onConfirm={handleConfirmVote}
        isConfirming={confirmStatus !== 'idle' && confirmStatus !== 'error'}
        status={confirmStatus}
        successText="Vote Cast"
        errorMessage={confirmError || undefined}
        onRetry={() => {
          setConfirmStatus('idle');
          setConfirmError(null);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.textSecondary,
              margin: 0,
            }}
          >
            {question}
          </p>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.primary,
              margin: 0,
            }}
          >
            {selectedOption !== null && options[selectedOption]}
          </p>
          <p
            style={{
              fontFamily: FONTS.mono,
              fontSize: '13px',
              color: COLORS.warning,
              margin: 0,
            }}
          >
            This action is permanent. Your vote cannot be changed.
          </p>
        </div>
      </ConfirmationModal>
    </>
  );
}
