import React from 'react';

export const RechargeModalTest = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Recharge Modal Test Shell</h3>
                <button className="btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};
