// client/src/components/MessageBox.js
import React from 'react';
import { XCircle } from 'lucide-react';

/**
 * Custom Message Box component (instead of alert and confirm)
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.text
 * @param {function} props.onClose - The function to call when the user clicks "OK" or "Cancel"
 * @param {function} [props.onConfirm] - Optional function to call on "Confirm"
 * @param {boolean} [props.showConfirmButton=false] - Optional prop to show a confirmation button
 * @returns {JSX.Element}
 */
const MessageBox = ({ title, text, onClose, onConfirm, showConfirmButton = false }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[99]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-105">
                <h2 className="text-xl font-bold mb-2 text-pink-600">{title}</h2>
                <p className="text-gray-700 mb-6">{text}</p>
                <div className="flex justify-center space-x-4">
                    {showConfirmButton && (
                        <button
                            onClick={onConfirm}
                            className="bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 hover:bg-red-600"
                        >
                            ยืนยัน
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 ${showConfirmButton ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
                    >
                        {showConfirmButton ? 'ยกเลิก' : 'ตกลง'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageBox;