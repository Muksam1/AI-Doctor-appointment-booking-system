import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaShoppingCart, FaSearch, FaFilter, FaCapsules, FaStethoscope, FaBaby, FaHeartbeat, FaTimes, FaCreditCard, FaMoneyBillWave, FaMobileAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirm }) => {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock form states
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
    const [walletDetails, setWalletDetails] = useState({ id: '', pin: '' });
    const [selectedWallet, setSelectedWallet] = useState('esewa'); // 'esewa' or 'khalti'

    if (!isOpen) return null;

    const handlePay = async () => {
        setIsProcessing(true);

        const orderData = {
            orderItems: Object.entries(cart).map(([id, qty]) => {
                const product = products.find(p => p.id === parseInt(id));
                return {
                    name: product.name,
                    qty,
                    price: product.price,
                    product: product.id
                };
            }),
            totalAmount: calculateTotal(),
            shippingAddress: {
                address: "Sample Address 123", // In real app, get from form
                city: "Kathmandu",
                postalCode: "44600"
            },
            paymentMethod: selectedWallet === 'esewa' ? 'eSewa' : 'Khalti'
        };

        // For Khalti and eSewa, we save it to localStorage and retrieve on Success page
        localStorage.setItem('pendingOrder', JSON.stringify(orderData));

        if (paymentMethod === 'wallet' && selectedWallet === 'esewa') {
            try {
                // Initiate eSewa Payment
                const { data } = await axios.post('/api/payments/esewa/initiate', {
                    totalAmount: totalAmount,
                    items: []
                });

                // Create and submit form programmatically
                const form = document.createElement("form");
                form.setAttribute("method", "POST");
                form.setAttribute("action", data.esewa_url);

                const fields = [
                    'amount', 'failure_url', 'product_delivery_charge', 'product_service_charge',
                    'product_code', 'signature', 'signed_field_names', 'success_url',
                    'tax_amount', 'total_amount', 'transaction_uuid'
                ];

                fields.forEach(field => {
                    const input = document.createElement("input");
                    input.setAttribute("type", "hidden");
                    input.setAttribute("name", field);
                    input.setAttribute("value", data[field]);
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
            } catch (err) {
                console.error("eSewa initiation failed:", err);
                alert("Failed to connect to eSewa. Please try again.");
                setIsProcessing(false);
            }
            return;
        }

        if (paymentMethod === 'wallet' && selectedWallet === 'khalti') {
            try {
                const { data } = await axios.post('/api/payments/khalti/initiate', {
                    totalAmount: totalAmount,
                    items: []
                });

                if (data.payment_url) {
                    window.location.href = data.payment_url;
                } else {
                    throw new Error("No payment URL received");
                }
            } catch (err) {
                console.error("Khalti initiation failed:", err);
                alert("Failed to connect to Khalti. Please try again.");
                setIsProcessing(false);
            }
            return;
        }

        // Simulation for other methods (Card, COD)
        setTimeout(() => {
            setIsProcessing(false);
            onConfirm();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-black text-[#111827]">Secure Checkout</h3>
                    {!isProcessing && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <FaTimes size={20} />
                        </button>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Payble</p>
                        <p className="text-4xl font-black text-healsync-indigo">Rs. {totalAmount}</p>
                    </div>

                    {isProcessing ? (
                        <div className="py-8 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 border-4 border-healsync-indigo border-t-transparent rounded-full animate-spin"></div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-black text-[#111827]">Processing Payment...</h4>
                                <p className="text-sm text-gray-500">Connecting to secure gateway</p>
                            </div>

                            {/* Allow cancel during processing (mostly for simulation) */}
                            <button
                                onClick={() => setIsProcessing(false)}
                                className="mt-4 px-8 py-2 border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
                            >
                                Cancel Payment
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                {['card', 'wallet', 'cod'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${paymentMethod === method ? 'bg-white text-healsync-indigo shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {method === 'cod' ? 'Cash' : method}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {paymentMethod === 'card' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <input
                                            type="text"
                                            placeholder="Card Number"
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                            value={cardDetails.number}
                                            onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                                        />
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                className="w-1/2 p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                                value={cardDetails.expiry}
                                                onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                placeholder="CVV"
                                                className="w-1/2 p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                                value={cardDetails.cvv}
                                                onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cardholder Name"
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                            value={cardDetails.name}
                                            onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                                        />
                                    </div>
                                )}

                                {paymentMethod === 'wallet' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex gap-3 mb-2">
                                            <div
                                                onClick={() => setSelectedWallet('esewa')}
                                                className={`flex-1 p-3 border-2 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${selectedWallet === 'esewa' ? 'border-healsync-indigo bg-blue-50/50 text-healsync-indigo' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                            >
                                                <FaMobileAlt /> eSewa
                                            </div>
                                            <div
                                                onClick={() => setSelectedWallet('khalti')}
                                                className={`flex-1 p-3 border-2 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${selectedWallet === 'khalti' ? 'border-purple-500 bg-purple-50/50 text-purple-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                            >
                                                <FaMobileAlt /> Khalti
                                            </div>
                                        </div>

                                        {selectedWallet === 'esewa' && (
                                            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold flex justify-between items-center border border-green-100">
                                                <span>Receiver:</span>
                                                <span className="font-black">9847212026</span>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            placeholder="Wallet ID / Mobile Number"
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                            value={walletDetails.id}
                                            onChange={e => setWalletDetails({ ...walletDetails, id: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="MPIN / PIN"
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-colors"
                                            value={walletDetails.pin}
                                            onChange={e => setWalletDetails({ ...walletDetails, pin: e.target.value })}
                                        />
                                    </div>
                                )}

                                {paymentMethod === 'cod' && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                                        <FaMoneyBillWave className="text-healsync-indigo text-xl mt-1 shrink-0" />
                                        <div>
                                            <p className="font-bold text-[#111827]">Cash on Delivery</p>
                                            <p className="text-sm text-gray-500">Pay Rs. {totalAmount} in cash when your order is delivered to your doorstep.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePay}
                                    className="flex-[2] py-4 bg-healsync-indigo hover:bg-healsync-violet text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const LabTests = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState({}); // { itemId: quantity }
    const [showPayment, setShowPayment] = useState(false);
    const [checkoutItem, setCheckoutItem] = useState(null); // 'all' or specific itemId
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const categories = [
        { name: 'All', icon: <FaFilter /> },
        { name: 'Medicines', icon: <FaCapsules /> },
        { name: 'Wellness', icon: <FaHeartbeat /> },
        { name: 'Mother & Baby', icon: <FaBaby /> },
        { name: 'Devices', icon: <FaStethoscope /> }
    ];

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await axios.get('/api/products');
                setProducts(data);
            } catch (err) {
                console.error("Error fetching products:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = activeCategory === 'All'
        ? products
        : products.filter(p => p.category === activeCategory);

    const updateQuantity = (id, delta) => {
        setCart(prev => {
            const currentQty = prev[id] || 0;
            const newQty = Math.max(0, currentQty + delta);
            const newCart = { ...prev };
            if (newQty === 0) delete newCart[id];
            else newCart[id] = newQty;
            return newCart;
        });
    };

    const addToCart = (id) => {
        updateQuantity(id, 1);
    };

    const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

    const calculateTotal = (itemId = null) => {
        if (itemId) {
            const product = products.find(p => p._id === itemId || p.id === itemId);
            return (product.price * (cart[itemId] || 1));
        }
        return Object.entries(cart).reduce((total, [id, qty]) => {
            const product = products.find(p => p._id === id || p.id === parseInt(id));
            return total + (product ? product.price * qty : 0);
        }, 0);
    };

    const handleBuyNow = (id) => {
        if (!cart[id]) updateQuantity(id, 1);
        setCheckoutItem(id);
        setShowPayment(true);
    };

    const handleCheckout = () => {
        if (totalCartItems === 0) return;
        setCheckoutItem(null); // checkout whole cart
        setShowPayment(true);
    };

    const confirmPayment = () => {
        // Logic to clear cart or process order would go here
        setShowPayment(false);
        setCart({});
        navigate('/payment-success');
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto animate-fade-up">
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-md">
                    <div className="w-12 h-12 border-4 border-healsync-indigo border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b border-healsync-border pb-10">
                <div className="space-y-4 flex-grow max-w-3xl">
                    <div className="flex items-center gap-3 text-healsync-mint font-black text-sm uppercase tracking-widest bg-healsync-mint/5 px-6 py-2.5 rounded-full w-fit border border-healsync-mint/10">
                        <FaShoppingCart className="text-lg" />
                        HealSync Pharmacy
                    </div>
                    <h1 className="text-5xl font-black text-[#111827] tracking-tighter">Wellness & Care Delivered</h1>
                    <div className="relative mt-6 max-w-xl group">
                        <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-healsync-grey group-focus-within:text-healsync-indigo transition-colors" />
                        <input
                            type="text"
                            placeholder="Search medicines, health products..."
                            className="input-field w-full pl-14 pr-6 py-5 rounded-[2rem] shadow-sm hover:shadow-md transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div onClick={handleCheckout} className="relative cursor-pointer group">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-healsync-border shadow-healsync flex items-center justify-center text-2xl text-[#111827] group-hover:bg-healsync-indigo group-hover:text-white transition-all">
                            <FaShoppingCart />
                        </div>
                        {totalCartItems > 0 && (
                            <span className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white text-xs font-black flex items-center justify-center rounded-full border-4 border-[#F9FAFB] shadow-lg animate-bounce">
                                {totalCartItems}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Categories */}
                <aside className="lg:w-72 shrink-0 space-y-8">
                    <div>
                        <h3 className="text-sm font-black text-healsync-grey uppercase tracking-widest mb-6 px-4">Shop by Category</h3>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <button
                                    key={cat.name}
                                    onClick={() => setActiveCategory(cat.name)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-lg transition-all ${activeCategory === cat.name
                                        ? 'bg-healsync-indigo text-white shadow-healsync'
                                        : 'bg-white border border-healsync-border text-healsync-grey hover:border-healsync-indigo hover:text-healsync-indigo'
                                        }`}
                                >
                                    <span className="text-xl">{cat.icon}</span>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-8 bg-gradient-to-br from-healsync-indigo to-healsync-violet text-white">
                        <h4 className="text-xl font-black mb-2 italic">Flash Sale!</h4>
                        <p className="text-sm opacity-80 mb-6">Up to 40% off on all wellness supplements this weekend.</p>
                        <button className="w-full py-3 bg-white text-healsync-indigo rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                            View Offers
                        </button>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredProducts.map(product => {
                            const qty = cart[product.id] || 0;
                            return (
                                <div key={product.id} className="healsync-card p-6 flex flex-col group h-full">
                                    <div className="relative aspect-square rounded-[2rem] bg-healsync-bg overflow-hidden flex items-center justify-center border border-healsync-border mb-6">
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                        ) : (
                                            <div className="text-7xl opacity-20 group-hover:scale-110 transition-all duration-700">
                                                {product.icon === 'FaCapsules' ? <FaCapsules /> :
                                                    product.icon === 'FaStethoscope' ? <FaStethoscope /> :
                                                        product.icon === 'FaBaby' ? <FaBaby /> :
                                                            product.icon === 'FaHeartbeat' ? <FaHeartbeat /> : <FaCapsules />}
                                            </div>
                                        )}
                                        {product.badge && (
                                            <div className="absolute top-4 left-4 px-3 py-1 bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                {product.badge}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-grow space-y-2 mb-6">
                                        <p className="text-xs font-black text-healsync-indigo uppercase tracking-widest">{product.category}</p>
                                        <h4 className="text-xl font-black text-[#111827] leading-tight">{product.name}</h4>
                                        <p className="text-sm text-healsync-grey font-medium line-clamp-2">{product.desc}</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-2xl font-black text-[#111827]">
                                                    Rs. {qty > 0 ? product.price * qty : product.price}
                                                </p>
                                                {qty > 0 && (
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        @{product.price} / unit
                                                    </p>
                                                )}
                                            </div>

                                            {qty === 0 ? (
                                                <button
                                                    onClick={() => addToCart(product.id)}
                                                    className="w-12 h-12 rounded-2xl bg-healsync-bg border border-healsync-border flex items-center justify-center text-[#111827] hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Add to Cart"
                                                >
                                                    <FaPlus />
                                                </button>
                                            ) : (
                                                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-3">
                                                    <button
                                                        onClick={() => updateQuantity(product.id, -1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500 transition-colors"
                                                    >
                                                        <FaMinus size={10} />
                                                    </button>
                                                    <span className="font-black text-sm w-4 text-center">{qty}</span>
                                                    <button
                                                        onClick={() => updateQuantity(product.id, 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-green-500 transition-colors"
                                                    >
                                                        <FaPlus size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleBuyNow(product.id)}
                                            className="w-full py-3 bg-healsync-indigo hover:bg-healsync-violet text-white rounded-xl font-bold uppercase tracking-wider text-sm shadow-healsync hover:shadow-healsync-hover transition-all active:scale-95"
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="py-20 text-center space-y-6">
                            <FaSearch className="text-6xl mx-auto text-healsync-grey/20" />
                            <p className="text-xl font-black text-healsync-grey uppercase tracking-widest">No products found in this category</p>
                        </div>
                    )}
                </div>
            </div>

            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                totalAmount={calculateTotal(checkoutItem)}
                onConfirm={confirmPayment}
            />
        </div>
    );
};

export default LabTests;
