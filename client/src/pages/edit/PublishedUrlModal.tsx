import React from "react";
import ReactDOM from "react-dom";

interface PublishedUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

const PublishedUrlModal: React.FC<PublishedUrlModalProps> = ({
  isOpen,
  onClose,
  url,
}) => {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(url);
  };

  const handleView = () => {
    window.open(url, "_blank"); // Open the URL in a new tab
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Published URL</h2>
        <p className="mb-4 break-words">{url}</p>
        <div className="flex justify-between">
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={handleView}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            View
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
};

export default PublishedUrlModal;