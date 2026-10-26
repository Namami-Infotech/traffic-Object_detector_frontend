declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const RAZORPAY_TEST_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_test_T7LgYpZ4gZV3EA';

/**
 * Dynamically ensures Razorpay Checkout SDK is loaded
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface OpenRazorpayCheckoutOptions {
  key?: string;
  orderId?: string;
  amount: number; // in Rupees
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void;
  onError?: (error: any) => void;
  onDismiss?: () => void;
}

/**
 * Open Razorpay Checkout Modal
 */
export async function openRazorpayCheckout(options: OpenRazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Failed to load Razorpay payment gateway. Please check your internet connection.');
  }

  const key = options.key || RAZORPAY_TEST_KEY_ID;
  const amountInPaise = Math.round(options.amount * 100);

  const checkoutOptions: any = {
    key,
    amount: amountInPaise,
    currency: options.currency || 'INR',
    name: options.name || 'TrafficVision AI',
    description: options.description || 'Secure Online Pass Booking',
    image: '/favicon.svg',
    prefill: {
      name: options.prefill?.name || '',
      contact: options.prefill?.contact || '',
      email: options.prefill?.email || 'driver@trafficvision.in',
    },
    notes: options.notes || {},
    theme: {
      color: '#1d4ed8', // TrafficVision primary brand blue
    },
    handler: (response: RazorpayPaymentSuccessResponse) => {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      escape: true,
      backdropclose: false,
    },
  };

  if (options.orderId) {
    checkoutOptions.order_id = options.orderId;
  }

  try {
    const rzp = new window.Razorpay(checkoutOptions);
    rzp.on('payment.failed', (failResp: any) => {
      if (options.onError) {
        options.onError(failResp?.error || failResp);
      }
    });
    rzp.open();
  } catch (err: any) {
    console.error('Error opening Razorpay modal:', err);
    throw err;
  }
}
