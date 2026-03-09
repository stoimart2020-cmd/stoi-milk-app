import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllProducts } from "../lib/api/products";
import axios from "axios";
import { useAuth } from "../hook/useAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const Product = () => {
  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
  });

  const { data: currentUser, isLoading, isPending } = useAuth();
  // console.log(currentUser?.data?.result?.id);

  const activeProduct =
    productsData?.data?.filter((prod) => prod.status === "active") || [];

  const [isTrialModalOpen, setTrialModalOpen] = useState(false);
  const [isSummaryModalOpen, setSummaryModalOpen] = useState(false);
  const [isAddMoneyModalOpen, setAddMoneyModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trialDays, setTrialDays] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");

  const handleTryItClick = (product) => {
    setSelectedProduct(product);
    setTrialModalOpen(true);
  };

  const handleTrialNext = () => {
    const baseAmount = selectedProduct.amount;
    const timeSlotMultiplier = timeSlots.length;
    const calculatedTotal = baseAmount * trialDays * timeSlotMultiplier;
    setTotalAmount(calculatedTotal);
    setTrialModalOpen(false);
    setSummaryModalOpen(true);
  };

  const handleAddMoney = () => {
    setSummaryModalOpen(false);
    setAddMoneyModalOpen(true);
  };

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().split("T")[0];
  };

  const handleSubmitPayment = async () => {
    if (!addMoneyAmount || addMoneyAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      // Step 1: Create order on backend
      const { data: order } = await axios.post(
        `${BASE_URL}/api/payment/create-order`,
        {
          amount: addMoneyAmount,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
        }
      );

      // Step 2: Open Razorpay payment modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Milk Service",
        description: "Add Money to Wallet",
        order_id: order.id,
        handler: async function (response) {
          // Step 3: Verify payment
          const verifyRes = await axios.post(
            `${BASE_URL}/api/payment/verify-payment`,
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: currentUser?.data?.result?.id, // Replace with logged-in user ID
              amount: addMoneyAmount,
            }
          );

          if (verifyRes.data.success) {
            alert(
              `Payment successful! Wallet balance: ₹${verifyRes.data.walletBalance}`
            );
            setAddMoneyModalOpen(false);
          } else {
            alert("Payment verification failed");
          }
        },
        theme: { color: "#3399cc" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error(error);
      alert("Something went wrong during payment");
    }
  };

  return (
    <>
      {activeProduct.map((product) => (
        <div
          key={product.id}
          className="flex lg:flex-row flex-col w-full max-w-xl bg-white rounded-xl shadow-md overflow-hidden border mb-4"
        >
          <div className="lg:w-48 w-full h-full">
            <img
              src={
                product.image?.startsWith("http")
                  ? product.image
                  : product.image?.includes("uploads/")
                    ? `${BASE_URL}${product.image.startsWith("/") ? "" : "/"}${product.image}`
                    : `${BASE_URL}/uploads/${product.image}`
              }
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/100x100?text=No+Image";
              }}
              alt="Milk Product"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-between flex-1 p-4">
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.description}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {product.offer}% OFF
              </span>
              <div className="text-right">
                <p className="text-sm text-gray-400 line-through">
                  ₹{product.mrp}
                </p>
                <p className="text-base text-blue-600 font-semibold">
                  ₹{product.amount}
                </p>
              </div>
            </div>
            <div className="flex justify-between gap-2 mt-4">
              <button
                onClick={() => handleTryItClick(product)}
                className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-md font-medium hover:bg-blue-200"
              >
                Try It
              </button>
              <button className="flex-1 bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Modal 1: Trial Selection */}
      {isTrialModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">
              3 Days Trial
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2">
                  Select Trial Days
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="radio radio-primary"
                    checked={trialDays === 3}
                    onChange={() => setTrialDays(3)}
                  />
                  <span>3 Days - ₹{selectedProduct.amount}</span>
                </label>
              </div>

              <div>
                <label className="block font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  min={getMinDate()}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Time Slot</label>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    value="morning"
                    checked={timeSlots.includes("morning")}
                    onChange={(e) =>
                      setTimeSlots((prev) =>
                        prev.includes(e.target.value)
                          ? prev.filter((t) => t !== e.target.value)
                          : [...prev, e.target.value]
                      )
                    }
                  />
                  Morning
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    value="evening"
                    checked={timeSlots.includes("evening")}
                    onChange={(e) =>
                      setTimeSlots((prev) =>
                        prev.includes(e.target.value)
                          ? prev.filter((t) => t !== e.target.value)
                          : [...prev, e.target.value]
                      )
                    }
                  />
                  Evening
                </label>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={handleTrialNext}
                className="btn btn-primary px-6"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Summary */}
      {isSummaryModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-green-600">
              Order Summary
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Product:</strong> {selectedProduct.name}
              </p>
              <p>
                <strong>Days:</strong> {trialDays}
              </p>
              <p>
                <strong>Time Slots:</strong> {timeSlots.join(", ")}
              </p>
              <p className="text-lg font-bold mt-4">Total: ₹{totalAmount}</p>
            </div>
            <div className="modal-action">
              <button onClick={handleAddMoney} className="btn btn-success px-6">
                Add Money
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add Money */}
      {isAddMoneyModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-black-600">
              Add Money to Wallet
            </h2>
            <input
              type="number"
              value={addMoneyAmount}
              onChange={(e) => setAddMoneyAmount(e.target.value)}
              placeholder="Enter amount"
              className="input input-bordered w-full"
            />
            <div className="modal-action">
              <button
                onClick={handleSubmitPayment}
                className="btn btn-accent px-6"
              >
                Submit & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
