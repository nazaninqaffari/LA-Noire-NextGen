/**
 * Payment Return Page
 * Handles Zarinpal callback after bail payment.
 * Reads Authority and Status from URL query params, verifies payment with backend.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { verifyBailPayment } from '../services/trial';
import './BailPayments.css';

const PaymentReturn: React.FC = () => {
  const { showNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<{
    status: string;
    detail: string;
    ref_id?: string;
    bail?: any;
  } | null>(null);

  useEffect(() => {
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status') || 'NOK';

    if (!authority) {
      setResult({ status: 'error', detail: 'No payment authority found in URL' });
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyBailPayment({ authority, status });
        setResult(res);
        if (res.status === 'success') {
          showNotification('Payment verified! Suspect has been released.', 'success');
        } else if (res.status === 'already_paid') {
          showNotification('This payment was already processed.', 'info');
        } else {
          showNotification('Payment verification failed.', 'error');
        }
      } catch {
        setResult({ status: 'error', detail: 'Failed to verify payment with server' });
        showNotification('Payment verification error', 'error');
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, showNotification]);

  return (
    <div className="page-container bail-page">
      <div className="payment-return-card card">
        {verifying ? (
          <div className="payment-verifying">
            <h2>Verifying Payment...</h2>
            <p>Please wait while we confirm your payment with the gateway.</p>
            <div className="spinner" />
          </div>
        ) : result?.status === 'success' ? (
          <div className="payment-success">
            <h2>✅ Payment Successful</h2>
            <p>{result.detail}</p>
            {result.ref_id && (
              <div className="ref-id">
                <strong>Transaction Reference:</strong> <code>{result.ref_id}</code>
              </div>
            )}
            {result.bail && (
              <div className="bail-summary">
                <p><strong>Suspect:</strong> {result.bail.suspect_name || `#${result.bail.suspect}`}</p>
                <p><strong>Amount:</strong> {new Intl.NumberFormat('fa-IR').format(result.bail.amount)} ﷼</p>
              </div>
            )}
            <Link to="/bail" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Back to Bail Payments
            </Link>
          </div>
        ) : result?.status === 'already_paid' ? (
          <div className="payment-info">
            <h2>ℹ️ Already Processed</h2>
            <p>{result.detail}</p>
            <Link to="/bail" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Back to Bail Payments
            </Link>
          </div>
        ) : (
          <div className="payment-failed">
            <h2>❌ Payment Failed</h2>
            <p>{result?.detail || 'Payment was not completed or was cancelled.'}</p>
            <Link to="/bail" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
