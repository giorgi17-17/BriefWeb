import { useEffect, useState } from "react";
import { X } from "lucide-react";

const NewSubjectModal = ({ isOpen, onClose, onAddSubject }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Subject name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onAddSubject({
        name: name.trim(),
        description: description.trim(),
      });

      if (success) {
        setName("");
        setDescription("");
        onClose();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div className="theme-card rounded-lg shadow-xl z-10 w-full max-w-md mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold theme-text-primary">
            Add New Subject
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full theme-bg-tertiary hover:theme-bg-secondary transition-colors"
          >
            <X className="h-5 w-5 theme-text-secondary" />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block mb-2 text-sm font-medium theme-text-primary"
            >
              Subject Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter subject name"
              className="theme-input w-full p-2 rounded"
              maxLength={100}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="description"
              className="block mb-2 text-sm font-medium theme-text-primary"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief description"
              className="theme-input w-full p-2 rounded"
              rows={3}
              maxLength={250}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="theme-button-secondary px-4 py-2 rounded"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="theme-button-primary px-4 py-2 rounded"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSubjectModal;
