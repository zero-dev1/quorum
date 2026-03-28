import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { useQNS } from '../hooks/useQNS';
import { usePollCreation } from '../hooks/usePollCreation';
import { PageTransition } from '../components/PageTransition';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { EligibilityBadge } from '../components/EligibilityBadge';
import { useToast } from '../stores/toastStore';
import { COLORS, FONTS, CREATION_FEE } from '../lib/constants';
import { MOTION } from '../lib/motion';

const MAX_QUESTION_LENGTH = 280;
const MAX_OPTION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

// Helper to validate Ethereum addresses
function isValidAddress(address: string | null | undefined): address is `0x${string}` {
  if (!address) return false;
  if (typeof address !== 'string') return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  return hexRegex.test(address);
}

export function CreatePoll() {
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const { hasQnsName } = useQNS(address);
  const {
    getCreationFee,
    checkIsExempt,
    createPoll,
    isLoading: isCreating,
    error,
  } = usePollCreation();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customEndDate, setCustomEndDate] = useState('');
  const [eligibilityType, setEligibilityType] = useState(0);
  const [eligibilityToken, setEligibilityToken] = useState('');
  const [eligibilityPodId, setEligibilityPodId] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isExempt, setIsExempt] = useState(false);
  const { toast } = useToast();
  const [creationFee, setCreationFee] = useState<bigint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'submitting' | 'confirming' | 'success' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeeInfo = async () => {
      // Guard: only fetch when address is valid
      if (!isValidAddress(address)) return;
      
      const fee = await getCreationFee();
      const exempt = await checkIsExempt(address);
      setCreationFee(fee);
      setIsExempt(exempt);
    };
    fetchFeeInfo();
  }, [address, getCreationFee, checkIsExempt]);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!question.trim()) return 'Question is required';
    if (question.length > MAX_QUESTION_LENGTH) return `Question must be ${MAX_QUESTION_LENGTH} characters or less`;
    if (options.some(o => !o.trim())) return 'All options must have text';
    if (options.some(o => o.length > MAX_OPTION_LENGTH)) return `Options must be ${MAX_OPTION_LENGTH} characters or less`;
    if (options.length < 2) return 'At least 2 options required';
    if (durationDays === null && !customEndDate) return 'Duration is required';
    if (eligibilityType === 2 && !eligibilityToken) return 'Token address is required';
    return null;
  };

  const handlePreview = () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setShowPreview(true);
  };

  const handleCreate = async () => {
    setShowConfirmation(true);
  };

  const handleConfirmCreate = async () => {
  setConfirmStatus('submitting');
  setConfirmError(null);

  await new Promise(r => setTimeout(r, 600));
  setConfirmStatus('confirming');

  try {
    const feeToSend = isExempt ? 0n : (creationFee || CREATION_FEE);

    const result = await createPoll(
      question,
      description,
      options.filter(o => o.trim()),
      durationDays || 7,
      eligibilityType,
      eligibilityToken as `0x${string}`,
      BigInt(eligibilityPodId || 0),
      feeToSend
    );

    if (result.success) {
      setConfirmStatus('success');
      await new Promise(r => setTimeout(r, 1500));
      setShowConfirmation(false);
      setConfirmStatus('idle');
      toast('Poll created successfully! Redirecting...', 'success');
      setTimeout(() => navigate('/explore'), 500);
    } else {
      setConfirmStatus('error');
      setConfirmError(error || 'Transaction failed. Please try again.');
    }
  } catch (err: any) {
    setConfirmStatus('error');
    setConfirmError(err?.message || 'Transaction failed. Please try again.');
  }
};

  if (!isConnected) {
    return (
      <div style={{ padding: '88px 24px', minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '18px',
              fontWeight: 400,
              color: COLORS.textSecondary,
            }}
          >
            Connect your wallet to create a poll.
          </p>
        </div>
      </div>
    );
  }

  if (!hasQnsName) {
    return (
      <div style={{ padding: '88px 24px', minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '18px',
              fontWeight: 400,
              color: COLORS.textSecondary,
              marginBottom: '24px',
            }}
          >
            You need a .qf name to create polls.
          </p>
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '14px 24px',
              backgroundColor: 'transparent',
              border: '1px solid #6366F1',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 400,
              color: '#6366F1',
              textDecoration: 'none',
              borderRadius: '0px',
            }}
          >
            Register a .qf name
          </a>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1
          style={{
            fontFamily: FONTS.headline,
            fontSize: '28px',
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: '0 0 32px 0',
          }}
        >
          Create a Poll
        </h1>

        {/* Question */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              marginBottom: '8px',
            }}
          >
            Your Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should we decide?"
            maxLength={MAX_QUESTION_LENGTH}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              fontFamily: FONTS.body,
              fontSize: '18px',
              color: COLORS.textPrimary,
              outline: 'none',
            }}
          />
          <div
            style={{
              textAlign: 'right',
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.textSecondary,
              marginTop: '4px',
            }}
          >
            {question.length}/{MAX_QUESTION_LENGTH}
          </div>
        </div>

        {/* Options */}
        <AnimatePresence>
          {question.trim().length >= 10 && (
            <motion.div
              key="options-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
              <label
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Options (2-10)
              </label>
              {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={MAX_OPTION_LENGTH}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      backgroundColor: COLORS.background,
                      border: `1px solid ${COLORS.border}`,
                      fontFamily: FONTS.body,
                      fontSize: '16px',
                      color: COLORS.textPrimary,
                  outline: 'none',
                }}
              />
              {index >= 2 && (
                <button
                  onClick={() => removeOption(index)}
                  style={{
                    padding: '12px 16px',
                    minHeight: '44px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: COLORS.error,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              onClick={addOption}
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                backgroundColor: 'transparent',
                border: 'none',
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.primary,
                cursor: 'pointer',
              }}
            >
              + Add Option
            </button>
          )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration */}
        <AnimatePresence>
          {options.filter(o => o.trim()).length >= 2 && (
            <motion.div
              key="duration-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
          <label
            style={{
              display: 'block',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              marginBottom: '8px',
            }}
          >
            Duration
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setDurationDays(days);
                  setCustomEndDate('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: durationDays === days ? 'rgba(99, 102, 241, 0.1)' : COLORS.background,
                  border: `1px solid ${durationDays === days ? COLORS.primary : COLORS.border}`,
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: durationDays === days ? COLORS.primary : COLORS.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {days} Day{days > 1 ? 's' : ''}
              </button>
            ))}
            <button
              onClick={() => {
                setDurationDays(null);
                setCustomEndDate('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: durationDays === null && customEndDate ? 'rgba(99, 102, 241, 0.1)' : COLORS.background,
                border: `1px solid ${durationDays === null && customEndDate ? COLORS.primary : COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: durationDays === null && customEndDate ? COLORS.primary : COLORS.textSecondary,
                cursor: 'pointer',
              }}
            >
              Custom
            </button>
          </div>
          {durationDays === null && (
            <input
              type="datetime-local"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{
                marginTop: '8px',
                padding: '12px 16px',
                backgroundColor: COLORS.background,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: COLORS.textPrimary,
                outline: 'none',
              }}
            />
          )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Eligibility */}
        <AnimatePresence>
          {options.filter(o => o.trim()).length >= 2 && (
            <motion.div
              key="eligibility-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
          <label
            style={{
              display: 'block',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              marginBottom: '8px',
            }}
          >
            Who Can Vote
          </label>
          {[
            { value: 0, label: 'Open to All' },
            { value: 1, label: 'QF Holders (native balance)' },
            { value: 2, label: 'Specific Token Holders' },
            { value: 3, label: 'QFLink Pod Members' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEligibilityType(opt.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: eligibilityType === opt.value ? 'rgba(99, 102, 241, 0.1)' : COLORS.background,
                border: `1px solid ${eligibilityType === opt.value ? COLORS.primary : COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                color: eligibilityType === opt.value ? COLORS.primary : COLORS.textSecondary,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              {opt.label}
            </button>
          ))}
          {eligibilityType === 2 && (
            <input
              type="text"
              value={eligibilityToken}
              onChange={(e) => setEligibilityToken(e.target.value)}
              placeholder="Token contract address 0x..."
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: COLORS.background,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.mono,
                fontSize: '14px',
                color: COLORS.textPrimary,
                outline: 'none',
              }}
            />
          )}
          {eligibilityType === 3 && (
            <input
              type="text"
              value={eligibilityPodId}
              onChange={(e) => setEligibilityPodId(e.target.value)}
              placeholder="Pod ID"
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: COLORS.background,
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.mono,
                fontSize: '14px',
                color: COLORS.textPrimary,
                outline: 'none',
              }}
            />
          )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Description */}
        <AnimatePresence>
          {(durationDays !== null || customEndDate) && (
            <motion.div
              key="description-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
          <label
            style={{
              display: 'block',
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textSecondary,
              marginBottom: '8px',
            }}
          >
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context or details..."
            maxLength={MAX_DESCRIPTION_LENGTH}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px 16px',
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.textPrimary,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div
            style={{
              textAlign: 'right',
              fontFamily: FONTS.mono,
              fontSize: '12px',
              color: COLORS.textSecondary,
              marginTop: '4px',
            }}
          >
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fee Display */}
        <div
          style={{
            marginBottom: '24px',
            fontFamily: FONTS.mono,
            fontSize: '13px',
            color: COLORS.textSecondary,
          }}
        >
          {isExempt
            ? 'Poll creation fee: Free (exempt)'
            : 'Poll creation fee: 100 QF'}
        </div>

        {formError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${COLORS.error}`,
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.error,
            }}
          >
            {formError}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${COLORS.error}`,
              fontFamily: FONTS.body,
              fontSize: '14px',
              color: COLORS.error,
            }}
          >
            {error}
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h3
              style={{
                fontFamily: FONTS.headline,
                fontSize: '20px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                margin: '0 0 16px 0',
              }}
            >
              Preview
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: '0 0 8px 0',
                }}
              >
                {question}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {options.filter(o => o.trim()).map((opt, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: COLORS.background,
                      border: `1px solid ${COLORS.border}`,
                      fontFamily: FONTS.body,
                      fontSize: '14px',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <EligibilityBadge
                eligibilityType={eligibilityType}
                eligibilityToken={eligibilityToken}
                eligibilityPodId={BigInt(eligibilityPodId || 0)}
              />
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <AnimatePresence>
          {(durationDays !== null || customEndDate) && (
            <motion.div
              key="submit-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '24px', marginTop: '32px' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={showPreview ? handleCreate : handlePreview}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '16px 24px',
              minHeight: '48px',
              backgroundColor: COLORS.primary,
              border: 'none',
              fontFamily: FONTS.body,
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.textPrimary,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating
              ? 'Creating...'
              : showPreview
              ? 'Create Poll'
              : 'Preview & Create'}
          </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        title="Create Poll"
        onCancel={() => {
          if (confirmStatus === 'idle' || confirmStatus === 'error') {
            setShowConfirmation(false);
            setConfirmStatus('idle');
            setConfirmError(null);
          }
        }}
        onConfirm={handleConfirmCreate}
        isConfirming={confirmStatus !== 'idle' && confirmStatus !== 'error'}
        confirmText="Create Poll"
        status={confirmStatus}
        successText="Poll Created"
        errorMessage={confirmError || undefined}
        onRetry={() => {
          setConfirmStatus('idle');
          setConfirmError(null);
        }}
      >
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: COLORS.textSecondary,
            margin: 0,
          }}
        >
          Are you sure you want to create this poll? This action will cost{' '}
          {isExempt ? 'no fee' : '100 QF'} and cannot be undone.
        </p>
      </ConfirmationModal>

      </div>
    </PageTransition>
  );
}
