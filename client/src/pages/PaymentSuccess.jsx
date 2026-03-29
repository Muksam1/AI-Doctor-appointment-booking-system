import React, { useEffect } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [orderData, setOrderData] = React.useState(location.state?.orderData || null);
    const [appointmentData, setAppointmentData] = React.useState(location.state?.appointmentData || null);

    // Results are now passed via location.state from PaymentVerification.jsx
    // or set directly for COD (Cash on Delivery) orders.

    const generateInvoice = () => {
        if (!orderData) return;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text("HealSync Pharmacy Invoice", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Order ID: ${orderData._id}`, 20, 40);
        doc.text(`Date: ${new Date(orderData.createdAt).toLocaleDateString()}`, 20, 50);
        doc.text(`Payment Method: ${orderData.paymentMethod}`, 20, 60);

        // Tables
        const tableColumn = ["Product Name", "Quantity", "Unit Price", "Total"];
        const tableRows = orderData.orderItems.map(item => [
            item.name,
            item.qty,
            `Rs. ${item.price}`,
            `Rs. ${item.qty * item.price}`
        ]);

        doc.autoTable(tableColumn, tableRows, { startY: 70 });

        doc.setFontSize(14);
        doc.text(`Grand Total: Rs. ${orderData.totalPrice}`, 20, doc.lastAutoTable.finalY + 20);

        doc.save(`HealSync_Invoice_${orderData._id}.pdf`);
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <FaCheckCircle className="text-8xl text-green-500 animate-bounce" />
            <h1 className="text-4xl font-bold">Payment Successful!</h1>
            <p className="text-slate-500 text-lg">
                {appointmentData
                    ? "Your appointment has been successfully confirmed."
                    : "Your order has been placed and is now being processed."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                {orderData && (
                    <button onClick={generateInvoice} className="btn-secondary px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                        Download Invoice (PDF)
                    </button>
                )}
                <Link to="/dashboard" className="btn-primary px-8">Go to Dashboard</Link>
                <Link to="/" className="px-8 py-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Back Home</Link>
            </div>
        </div>
    );
};

export default PaymentSuccess;
