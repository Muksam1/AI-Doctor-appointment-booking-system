import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaShoppingCart, FaSearch, FaFilter, FaCapsules, FaStethoscope, FaBaby, FaHeartbeat, FaTimes, FaCreditCard, FaMoneyBillWave, FaMobileAlt, FaCcVisa, FaCcMastercard, FaCcAmex, FaCcJcb, FaInfoCircle, FaPaperPlane, FaImage, FaFileVideo, FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirm, cart, setCart, products, checkoutItem }) => {
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock form states
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
    const [walletDetails, setWalletDetails] = useState({ id: '', pin: '' });
    const [selectedWallet, setSelectedWallet] = useState('esewa'); // 'esewa' or 'khalti'

    const handlePay = async () => {
        if (totalAmount <= 0) {
            toast.error('Cart is empty or invalid. Please add items.');
            return;
        }
        setIsProcessing(true);

        const itemsToProcess = checkoutItem
            ? { [checkoutItem]: cart[checkoutItem] || 1 }
            : cart;

        const orderItems = Object.entries(itemsToProcess).map(([id, qty]) => {
            const product = products.find(p => (p._id && p._id.toString() === id.toString()) || (p.id && p.id.toString() === id.toString()));
            if (!product) return null;
            return {
                name: product.name,
                qty,
                price: product.price,
                product: product._id || product.id,
                image: product.image
            };
        }).filter(item => item !== null);

        if (orderItems.length === 0) {
            toast.error('Order items are invalid. Please try again.');
            setIsProcessing(false);
            return;
        }

        const orderData = {
            orderItems,
            totalAmount: totalAmount,
            shippingAddress: {
                address: "Sample Address 123", // In real app, get from form
                city: "Kathmandu",
                postalCode: "44600"
            },
            paymentMethod: paymentMethod === 'cod' ? 'Cod' : (selectedWallet === 'esewa' ? 'eSewa' : 'Khalti')
        };

        // For Khalti and eSewa, we save it to localStorage and retrieve on Success page
        if (paymentMethod !== 'cod') {
            localStorage.setItem('pendingOrder', JSON.stringify(orderData));
        }

        if (paymentMethod === 'cod') {
            try {
                const { data } = await axios.post('/api/orders', orderData);
                setIsProcessing(false);
                onClose();
                setCart({});
                navigate('/payment-success', { state: { orderData: data } });
            } catch (err) {
                console.error("Order placement failed:", err);
                const errorMessage = err.response?.data?.message || err.message;
                toast.error(`Failed to place order: ${errorMessage}`);
                setIsProcessing(false);
            }
            return;
        }

        if (paymentMethod === 'wallet' || paymentMethod === 'card') {
            const gatewayToUse = paymentMethod === 'card' ? 'esewa' : selectedWallet;

            try {
                // Important: Create order FIRST for wallet payments too
                const { data: orderResponse } = await axios.post('/api/orders', orderData);
                const orderId = orderResponse._id;

                if (gatewayToUse === 'esewa') {
                    // Initiate eSewa with the newly created orderId
                    const { data } = await axios.post('/api/payments/esewa/initiate', {
                        orderId: orderId,
                        amount: totalAmount
                    });

                    const form = document.createElement("form");
                    form.method = "POST";
                    form.action = data.payment_url;
                    
                    Object.keys(data.formData).forEach(key => {
                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = key;
                        input.value = data.formData[key];
                        form.appendChild(input);
                    });
                    document.body.appendChild(form);
                    form.submit();
                } else if (gatewayToUse === 'khalti') {
                    const { data } = await axios.post('/api/payments/khalti/initiate', {
                        orderId: orderId,
                        amount: totalAmount
                    });
                    if (data.payment_url) window.location.href = data.payment_url;
                }
            } catch (err) {
                console.error("Wallet checkout failed:", err);
                toast.error('Failed to initiate secure payment. Please try again.');
                setIsProcessing(false);
            }
            return;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:h-auto md:max-w-4xl md:rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-black text-[#111827]">Secure Checkout</h3>
                    {!isProcessing && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <FaTimes size={20} />
                        </button>
                    )}
                </div>

                <div className="p-8 md:p-12 space-y-8 grow overflow-y-auto">
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
                                    <div className="p-6 border-2 border-blue-500 rounded-xl space-y-6 animate-in fade-in slide-in-from-bottom-2 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full border-4 border-blue-500 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                </div>
                                                <p className="font-bold text-[#111827]">Debit or credit card</p>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">All major cards accepted</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-gray-700">Card number:</label>
                                                <input
                                                    type="text"
                                                    placeholder="0000 0000 0000 0000"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                />
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-sm font-bold text-gray-700">Expiry date:</label>
                                                    <input
                                                        type="text"
                                                        placeholder="MM / YY"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-bold text-gray-700">CVC/CVV:</label>
                                                        <FaInfoCircle className="text-gray-400 text-xs" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="123"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-gray-700">Cardholder name:</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                />
                                            </div>

                                            <div className="flex gap-2 pt-2 grayscale opacity-80">
                                                <FaCcVisa className="text-3xl text-blue-800" />
                                                <FaCcMastercard className="text-3xl text-orange-600" />
                                                <FaCcAmex className="text-3xl text-blue-500" />
                                                <FaCcJcb className="text-3xl text-blue-900" />
                                            </div>
                                        </div>
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
                                    className="flex-2 py-4 bg-healsync-indigo hover:bg-healsync-violet text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
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
            const product = products.find(p => (p._id && p._id.toString() === itemId.toString()) || (p.id && p.id.toString() === itemId.toString()));
            return product ? (product.price * (cart[itemId] || 1)) : 0;
        }
        return Object.entries(cart).reduce((total, [id, qty]) => {
            const product = products.find(p => (p._id && p._id.toString() === id.toString()) || (p.id && p.id.toString() === id.toString()));
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
        <div className="space-y-12 w-full animate-fade-up px-4 md:px-8">
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
                    <div className="relative mt-6 max-w-2xl group">
                        <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-healsync-grey group-focus-within:text-healsync-indigo transition-colors" />
                        <input
                            type="text"
                            placeholder="Search medicines, health products..."
                            className="input-field w-full pl-14 pr-6 py-5 rounded-4xl shadow-sm hover:shadow-md transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div onClick={handleCheckout} className="relative cursor-pointer group">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-healsync-border shadow-healsync flex items-center justify-center text-2xl text-[#111827] group-hover:bg-healsync-indigo group-hover:text-white transition-all">
                            <FaShoppingCart />
                        </div>
                        {totalCartItems > 0 && (
                            <span className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white text-xs font-black flex items-center justify-center rounded-full border-4 border-healsync-bg shadow-lg animate-bounce">
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

                    <div className="glass-panel p-8 bg-linear-to-br from-healsync-indigo to-healsync-violet text-white">
                        <h4 className="text-xl font-black mb-2 italic">Flash Sale!</h4>
                        <p className="text-sm opacity-80 mb-6">Up to 40% off on all wellness supplements this weekend.</p>
                        <button className="w-full py-3 bg-white text-healsync-indigo rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                            View Offers
                        </button>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredProducts.map(product => {
                            const pId = product._id || product.id;
                            const qty = cart[pId] || 0;
                            return (
                                <div key={pId} className="healsync-card p-6 flex flex-col group h-full">
                                    <div className="relative aspect-square rounded-4xl bg-healsync-bg overflow-hidden flex items-center justify-center border border-healsync-border mb-6">
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

                                    <div className="grow space-y-2 mb-6">
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
                                                    onClick={() => addToCart(pId)}
                                                    className="w-12 h-12 rounded-2xl bg-healsync-bg border border-healsync-border flex items-center justify-center text-[#111827] hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Add to Cart"
                                                >
                                                    <FaPlus />
                                                </button>
                                            ) : (
                                                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-3">
                                                    <button
                                                        onClick={() => updateQuantity(pId, -1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500 transition-colors"
                                                    >
                                                        <FaMinus size={10} />
                                                    </button>
                                                    <span className="font-black text-sm w-4 text-center">{qty}</span>
                                                    <button
                                                        onClick={() => updateQuantity(pId, 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-green-500 transition-colors"
                                                    >
                                                        <FaPlus size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleBuyNow(pId)}
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
                cart={cart}
                setCart={setCart}
                products={products}
                checkoutItem={checkoutItem}
            />
        </div>
    );
};

export default LabTests;
