import { ConfirmActionModal } from "@/shared/ui";

type MoveWordToLearningModalProps = {
  errorMessage?: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  sourceText: string;
  visible: boolean;
};

export function MoveWordToLearningModal({
  errorMessage,
  loading,
  onCancel,
  onConfirm,
  sourceText,
  visible,
}: MoveWordToLearningModalProps) {
  return (
    <ConfirmActionModal
      confirmTitle="Move to learning"
      errorMessage={errorMessage}
      loading={loading}
      loadingTitle="Moving..."
      message={`"${sourceText}" will leave Mastered Words and mastered collections. Its mastery progress and official learning interval will restart.`}
      supportingMessage="Review boxes and review/practice history will stay."
      title="Move back to learning?"
      visible={visible}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
