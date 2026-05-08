import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownRight,
  Check,
  FlaskConical,
  Heart,
  Menu,
  Package,
  Sparkle,
  Sun,
  X,
} from "lucide-react";
import "./styles.css";
import harvestMango from "./assets/harvest/Harvest.png";
import alphonsoMango from "./assets/Alphanso/Alphanso.jpg";
import kesarMango from "./assets/Kesar/Kesar.jpg";
import langraMango from "./assets/Langra/Langra.jpg";
import orchardImage from "./assets/Orchad/Orchad.jpg";
import whyMangoesImage from "./assets/why_mangoes/why_mangoes.png";

const mangoOptions = [
  { id: "alphonso", name: "Alphonso", note: "Saffron - Honey - Floral" },
  { id: "kesar", name: "Kesar", note: "Apricot - Bright - Aromatic" },
  { id: "langra", name: "Langra", note: "Tangy - Pulpy - Citrus zest" },
];

const boxOptions = [
  {
    id: "royal-dozen",
    count: "12",
    title: "Royal Dozen",
    description: "Plump & premium - our largest mangoes.",
    weight: "230-270 gms",
    price: 1150,
  },
  {
    id: "family-feast",
    count: "15",
    title: "Family Feast",
    description: "Perfectly sized - ripe, juicy, and ready to share.",
    weight: "200-230 gms",
    price: 1150,
  },
  {
    id: "mango-mela",
    count: "18",
    title: "Mango Mela",
    description: "Best value - more mangoes, same orchard magic.",
    weight: "180-200 gms",
    price: 1000,
    badge: "Best value",
  },
];

const orderStorageKey = "aamra-orders";
const googleSheetWebAppUrl = import.meta.env.VITE_GOOGLE_SHEET_WEB_APP_URL ?? "";
const blankCustomerDetails = {
  fullName: "",
  phone: "9876543210",
  email: "",
  address: "",
  city: "",
  pincode: "400001",
  notes: "",
};

const toCsvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function MangoGraphic({ orchard = false }) {
  if (orchard) {
    return (
      <svg viewBox="0 0 100 100" className="mango-svg" aria-hidden="true">
        <circle cx="25" cy="30" r="12" fill="#ff9500" />
        <circle cx="75" cy="25" r="12" fill="#ff9500" />
        <circle cx="50" cy="45" r="12" fill="#ff9500" />
        <line x1="50" y1="0" x2="50" y2="20" stroke="#8b4513" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="mango-svg" aria-hidden="true">
      <ellipse cx="50" cy="50" rx="35" ry="40" fill="#ff9500" />
      <path d="M50 5 Q60 20 55 30" stroke="#228b22" strokeWidth="2" fill="none" />
    </svg>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [route, setRoute] = React.useState(() => window.location.pathname);
  const [bookingId, setBookingId] = React.useState(() => {
    const match = window.location.pathname.match(/^\/(?:checkout|confirmation|edit)\/([^/]+)$/);
    return match?.[1] ?? `booking-${Date.now()}`;
  });
  const [confirmedOrder, setConfirmedOrder] = React.useState(null);
  const [sellerSyncMessage, setSellerSyncMessage] = React.useState("");
  const [orderSyncStatus, setOrderSyncStatus] = React.useState("");
  const [bookingItems, setBookingItems] = React.useState([
    { id: 1, mangoId: "alphonso", boxId: "family-feast", quantity: 1 },
  ]);
  const [customerDetails, setCustomerDetails] = React.useState(blankCustomerDetails);
  const closeMenu = () => setMenuOpen(false);
  const isCheckoutPage = route.startsWith("/checkout/");
  const isConfirmationPage = route.startsWith("/confirmation/");
  const isEditPage = route.startsWith("/edit/");
  const isSellerOrdersPage = route === "/seller-orders";
  const saveBooking = (id = bookingId) => {
    localStorage.setItem(
      `aamra-booking-${id}`,
      JSON.stringify({ bookingItems, customerDetails }),
    );
  };
  const navigateTo = (path) => {
    window.history.pushState(null, "", path);
    setRoute(path);
  };
  const updateCustomerDetails = (field, value) => {
    setCustomerDetails((details) => ({ ...details, [field]: value }));
  };
  const returnToBooking = () => {
    navigateTo(`/edit/${bookingId}`);
    closeMenu();
    window.requestAnimationFrame(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    });
  };
  const getBox = (boxId) => boxOptions.find((box) => box.id === boxId) ?? boxOptions[0];
  const getMango = (mangoId) =>
    mangoOptions.find((mango) => mango.id === mangoId) ?? mangoOptions[0];
  const orderTotal = bookingItems.reduce(
    (total, item) => total + getBox(item.boxId).price * item.quantity,
    0,
  );
  const formatPrice = (price) => `Rs ${price.toLocaleString("en-IN")}`;
  const createOrderRecord = () => ({
    id: bookingId,
    placedAt: new Date().toISOString(),
    customerDetails,
    items: bookingItems.map((item) => {
      const box = getBox(item.boxId);
      const mango = getMango(item.mangoId);

      return {
        id: item.id,
        mangoId: item.mangoId,
        mangoName: mango.name,
        boxId: item.boxId,
        boxTitle: box.title,
        boxCount: box.count,
        boxWeight: box.weight,
        quantity: item.quantity,
        unitPrice: box.price,
        lineTotal: box.price * item.quantity,
      };
    }),
    total: orderTotal,
    status: "Pending confirmation",
  });
  const getSavedOrders = () => {
    try {
      const orders = JSON.parse(localStorage.getItem(orderStorageKey) ?? "[]");
      return Array.isArray(orders) ? orders : [];
    } catch {
      return [];
    }
  };
  const saveOrder = (order) => {
    const orders = getSavedOrders().filter((savedOrder) => savedOrder.id !== order.id);
    const updatedOrders = [...orders, order];
    localStorage.setItem(orderStorageKey, JSON.stringify(updatedOrders));
    localStorage.setItem(`aamra-confirmed-order-${order.id}`, JSON.stringify(order));
  };
  const syncOrderToGoogleSheet = async (order) => {
    if (!googleSheetWebAppUrl) {
      return { ok: false, reason: "Google Sheet endpoint is not configured." };
    }

    try {
      const response = await fetch(googleSheetWebAppUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ payload: JSON.stringify(order) }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          ok: false,
          reason: `Google Sheet sync failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Could not sync order.",
      };
    }
  };
  const getOrdersCsv = (orders = getSavedOrders()) => {
    if (!orders.length) {
      return "";
    }

    const headers = [
      "Booking ID",
      "Placed At",
      "Customer Name",
      "Phone",
      "Email",
      "Mango Variety",
      "Box Option",
      "Pieces",
      "Weight Per Piece",
      "Boxes",
      "Unit Price INR",
      "Line Total INR",
      "Order Total INR",
      "Address",
      "City",
      "Pincode",
      "Notes",
      "Status",
    ];
    const rows = orders.flatMap((order) =>
      order.items.map((item) => [
        order.id,
        order.placedAt,
        order.customerDetails.fullName,
        order.customerDetails.phone,
        order.customerDetails.email,
        item.mangoName,
        item.boxTitle,
        item.boxCount,
        item.boxWeight,
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        order.total,
        order.customerDetails.address,
        order.customerDetails.city,
        order.customerDetails.pincode,
        order.customerDetails.notes,
        order.status,
      ]),
    );

    return [headers, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
  };
  const downloadOrdersCsv = () => {
    const csv = getOrdersCsv();

    if (!csv) {
      return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aamra-seller-orders.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const updateBookingItem = (id, field, value) => {
    setBookingItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };
  const addBookingItem = (boxId = "family-feast") => {
    setBookingItems((items) => [
      ...items,
      {
        id: Date.now(),
        mangoId: "alphonso",
        boxId,
        quantity: 1,
      },
    ]);
  };
  const removeBookingItem = (id) => {
    setBookingItems((items) => items.filter((item) => item.id !== id));
  };
  const togglePack = (boxId) => {
    setBookingItems((items) => {
      const existingItem = items.find((item) => item.boxId === boxId);

      if (!existingItem) {
        return [
          ...items,
          {
            id: Date.now(),
            mangoId: "alphonso",
            boxId,
            quantity: 1,
          },
        ];
      }

      if (items.length === 1) {
        return items;
      }

      return items.filter((item) => item.id !== existingItem.id);
    });
  };
  const goToCheckout = (event) => {
    event.preventDefault();
    saveBooking();
    navigateTo(`/checkout/${bookingId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const placeOrder = async () => {
    const order = createOrderRecord();
    saveBooking();
    saveOrder(order);
    setConfirmedOrder(order);
    setOrderSyncStatus("Saving order to Google Sheet...");
    navigateTo(`/confirmation/${bookingId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const result = await syncOrderToGoogleSheet(order);
    setOrderSyncStatus(result.ok ? "Order saved to Google Sheet." : `Google Sheet sync failed: ${result.reason}`);
  };
  const syncSavedOrdersToGoogleSheet = async () => {
    const orders = getSavedOrders();

    if (!orders.length) {
      setSellerSyncMessage("No local orders to sync yet.");
      return;
    }

    if (!googleSheetWebAppUrl) {
      setSellerSyncMessage("Google Sheet endpoint is not configured yet.");
      return;
    }

    setSellerSyncMessage("Syncing local orders...");
    const results = await Promise.all(orders.map((order) => syncOrderToGoogleSheet(order)));
    const syncedCount = results.filter((result) => result.ok).length;

    setSellerSyncMessage(
      syncedCount === orders.length
        ? `Synced ${syncedCount} order${syncedCount === 1 ? "" : "s"} to Google Sheets.`
        : `Synced ${syncedCount} of ${orders.length} orders. Please try again.`,
    );
  };
  const startNewOrder = () => {
    const nextBookingId = `booking-${Date.now()}`;
    setBookingId(nextBookingId);
    setBookingItems([{ id: 1, mangoId: "alphonso", boxId: "family-feast", quantity: 1 }]);
    setCustomerDetails(blankCustomerDetails);
    setConfirmedOrder(null);
    navigateTo("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  React.useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    const match = route.match(/^\/(?:checkout|confirmation|edit)\/([^/]+)$/);

    if (!match) {
      return;
    }

    const id = match[1];
    const savedBooking = localStorage.getItem(`aamra-booking-${id}`);
    setBookingId(id);

    if (!savedBooking) {
      if (route.startsWith("/confirmation/")) {
        const savedOrder = localStorage.getItem(`aamra-confirmed-order-${id}`);
        setConfirmedOrder(savedOrder ? JSON.parse(savedOrder) : null);
      }

      return;
    }

    try {
      const parsedBooking = JSON.parse(savedBooking);

      if (Array.isArray(parsedBooking.bookingItems)) {
        setBookingItems(parsedBooking.bookingItems);
      }

      if (parsedBooking.customerDetails) {
        setCustomerDetails((details) => ({
          ...details,
          ...parsedBooking.customerDetails,
        }));
      }

      if (route.startsWith("/confirmation/")) {
        const savedOrder = localStorage.getItem(`aamra-confirmed-order-${id}`);
        setConfirmedOrder(savedOrder ? JSON.parse(savedOrder) : null);
      }
    } catch {
      localStorage.removeItem(`aamra-booking-${id}`);
    }
  }, [route]);

  React.useEffect(() => {
    if (isEditPage) {
      window.requestAnimationFrame(() => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [isEditPage]);

  if (isSellerOrdersPage) {
    const savedOrders = getSavedOrders();
    const totalRevenue = savedOrders.reduce((total, order) => total + order.total, 0);
    const totalBoxes = savedOrders.reduce(
      (total, order) =>
        total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
      0,
    );

    return (
      <main>
        <header className="site-header">
          <a className="brand" href="/" aria-label="Aamra home" onClick={(event) => {
            event.preventDefault();
            navigateTo("/");
          }}>
            <span className="brand-mark"><Sparkle size={15} /></span>
            <span>Aamra</span>
          </a>
          <nav className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
            <a href="/" onClick={(event) => {
              event.preventDefault();
              navigateTo("/");
            }}>Storefront</a>
          </nav>
          <button type="button" className="order-crate-btn" onClick={downloadOrdersCsv}>
            Export orders
          </button>
          <button
            className="icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <section className="seller-page">
          <div className="seller-shell">
            <div className="seller-heading">
              <p className="contact-kicker">Seller orders</p>
              <h1>All local orders in one place.</h1>
              <p>
                Orders placed on this browser are saved here and can be exported
                as one CSV for Excel or Google Sheets.
              </p>
            </div>

            <div className="seller-stats">
              <article>
                <span>Orders</span>
                <strong>{savedOrders.length}</strong>
              </article>
              <article>
                <span>Boxes</span>
                <strong>{totalBoxes}</strong>
              </article>
              <article>
                <span>Revenue</span>
                <strong>{formatPrice(totalRevenue)}</strong>
              </article>
            </div>

            <div className="seller-toolbar">
              <button type="button" className="send-button" onClick={downloadOrdersCsv} disabled={!savedOrders.length}>
                Export all orders CSV
              </button>
              <button type="button" className="secondary-action" onClick={syncSavedOrdersToGoogleSheet} disabled={!savedOrders.length}>
                Sync to Google Sheet
              </button>
            </div>
            {sellerSyncMessage && <p className="seller-sync-message">{sellerSyncMessage}</p>}

            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {savedOrders.length ? (
                    savedOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.customerDetails.fullName || "-"}</td>
                        <td>{order.customerDetails.phone}</td>
                        <td>
                          {order.items.map((item) => `${item.mangoName} ${item.boxTitle} x ${item.quantity}`).join(", ")}
                        </td>
                        <td>{formatPrice(order.total)}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No orders have been placed in this browser yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isCheckoutPage) {
    return (
      <main>
        <header className="site-header">
          <a className="brand" href="/edit" aria-label="Aamra home" onClick={(event) => {
            event.preventDefault();
            returnToBooking();
          }}>
            <span className="brand-mark"><Sparkle size={15} /></span>
            <span>Aamra</span>
          </a>
          <nav className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
            <a href={`/edit/${bookingId}`} onClick={(event) => {
              event.preventDefault();
              returnToBooking();
            }}>Edit booking</a>
          </nav>
          <a className="order-crate-btn" href={`/edit/${bookingId}`} onClick={(event) => {
            event.preventDefault();
            returnToBooking();
          }}>
            Edit order
          </a>
          <button
            className="icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <section className="checkout-page" id="checkout">
          <div className="checkout-shell">
            <div className="checkout-copy">
              <p className="contact-kicker">Checkout</p>
              <h1>
                Confirm your <span className="highlight">mango</span> booking.
              </h1>
              <p>
                Review your selected mangoes and packs. We will call before
                dispatch to confirm delivery timing and payment details.
              </p>
              <button type="button" className="secondary-action" onClick={returnToBooking}>
                Edit booking
              </button>
            </div>

            <div className="checkout-card">
              <h2>Order summary</h2>
              <div className="checkout-lines">
                {bookingItems.map((item) => {
                  const mango = getMango(item.mangoId);
                  const box = getBox(item.boxId);
                  const lineTotal = box.price * item.quantity;

                  return (
                    <div className="checkout-line" key={item.id}>
                      <div>
                        <strong>{mango.name} - {box.title}</strong>
                        <span>
                          {box.count} pcs, {box.weight} x {item.quantity} box
                          {item.quantity > 1 ? "es" : ""}
                        </span>
                      </div>
                      <b>{formatPrice(lineTotal)}</b>
                    </div>
                  );
                })}
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <strong>{formatPrice(orderTotal)}</strong>
              </div>
              <button type="button" className="send-button" onClick={placeOrder}>
                Place order
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isConfirmationPage) {
    const order = confirmedOrder ?? createOrderRecord();

    return (
      <main>
        <header className="site-header">
          <a className="brand" href="/" aria-label="Aamra home" onClick={(event) => {
            event.preventDefault();
            startNewOrder();
          }}>
            <span className="brand-mark"><Sparkle size={15} /></span>
            <span>Aamra</span>
          </a>
          <nav className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
            <a href="/" onClick={(event) => {
              event.preventDefault();
              startNewOrder();
            }}>New order</a>
          </nav>
          <button type="button" className="order-crate-btn" onClick={startNewOrder}>
            New order
          </button>
          <button
            className="icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <section className="confirmation-page">
          <div className="confirmation-shell">
            <div className="confirmation-copy">
              <p className="contact-kicker">Order placed</p>
              <h1>
                Your mangoes are <span className="highlight">reserved.</span>
              </h1>
              <p>
                Thanks, {order.customerDetails.fullName || "there"}. We saved your
                order details and will call before dispatch to confirm delivery timing.
              </p>
              <button type="button" className="primary-action" onClick={startNewOrder}>
                Place another order
              </button>
            </div>

            <div className="checkout-card confirmation-card">
              <div className="confirmation-status">
                <span><Check size={22} /></span>
                <div>
                  <strong>Booking ID</strong>
                  <em>{order.id}</em>
                </div>
              </div>
              <h2>Confirmed summary</h2>
              <div className="checkout-lines">
                {order.items.map((item) => (
                  <div className="checkout-line" key={item.id}>
                    <div>
                      <strong>{item.mangoName} - {item.boxTitle}</strong>
                      <span>
                        {item.boxCount} pcs, {item.boxWeight} x {item.quantity} box
                        {item.quantity > 1 ? "es" : ""}
                      </span>
                    </div>
                    <b>{formatPrice(item.lineTotal)}</b>
                  </div>
                ))}
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
              <div className="customer-summary">
                <span>Delivery</span>
                <p>{order.customerDetails.address || "Address not provided"}</p>
                <p>{[order.customerDetails.city, order.customerDetails.pincode].filter(Boolean).join(" - ")}</p>
                <p>{order.customerDetails.phone}</p>
              </div>
              {orderSyncStatus && (
                <div className="sync-status">
                  <strong>Sheet sync:</strong> {orderSyncStatus}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Aamra home" onClick={closeMenu}>
          <span className="brand-mark"><Sparkle size={15} /></span>
          <span>Aamra</span>
        </a>
        <nav className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
          <a href="#varieties" onClick={closeMenu}>Varieties</a>
          <a href="#benefits" onClick={closeMenu}>Benefits</a>
          <a href="#orchard" onClick={closeMenu}>Our Orchard</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
        </nav>
        <a className="order-crate-btn" href="#contact">Order a crate</a>
        <button
          className="icon-button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-content">
          <p className="eyebrow">SUN-RIPENED - FAMILY FARMED SINCE 1972</p>
          <h1>
            The most honest <span className="highlight">mango</span> you'll
            taste this season.
          </h1>
          <p className="hero-copy">
            Hand-picked at peak ripeness from our seventy-acre Konkan orchard,
            packed the same morning, and shipped straight to your doorstep - no
            calcium carbide, no cold storage, no compromises.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#varieties">
              Meet the varieties <ArrowDownRight size={18} />
            </a>
            <a className="secondary-action" href="#orchard">
              Our story
            </a>
          </div>
          <div className="hero-stats" aria-label="Aamra farm statistics">
            <div>
              <strong>70+</strong>
              <span>Acres of orchard</span>
            </div>
            <div>
              <strong>07</strong>
              <span>Varieties grown</span>
            </div>
            <div>
              <strong>118K</strong>
              <span>Crates shipped / yr</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img
            src={harvestMango}
            alt="A ripe mango presented on a white tray"
          />
          <div className="harvest-badge">
            <span><Sparkle size={18} /></span>
            <div>
              <strong>Today's harvest</strong>
              <em>Alphonso - Lot 21</em>
            </div>
          </div>
        </div>
      </section>

      <section className="varieties-section" id="varieties">
        <div className="varieties-inner">
          <p className="varieties-kicker">02 - Varieties</p>
          <h2>
            Seven varieties. <span>One obsession.</span>
          </h2>
          <p className="varieties-intro">
            From regal Alphonsos to vibrant Kesars, every fruit is harvested
            when its sugar-acid ratio is exactly where it should be.
          </p>

          <div className="mango-gallery">
            <article className="mango-card">
              <div className="mango-card-image">
                <img
                  src={alphonsoMango}
                  alt="Alphonso mango on a pale surface"
                />
                <span className="count-badge">01 / 03</span>
                <span className="season-badge">Mar - May</span>
              </div>
              <div className="mango-card-body">
                <h3>Alphonso</h3>
                <p>Saffron - Honey - Floral</p>
              </div>
            </article>

            <article className="mango-card">
              <div className="mango-card-image">
                <img
                  src={kesarMango}
                  alt="Pile of ripe Kesar mangoes"
                />
                <span className="count-badge">02 / 03</span>
                <span className="season-badge">Apr - Jun</span>
              </div>
              <div className="mango-card-body">
                <h3>Kesar</h3>
                <p>Apricot - Bright - Aromatic</p>
              </div>
            </article>

            <article className="mango-card">
              <div className="mango-card-image">
                <img
                  src={langraMango}
                  alt="Green Langra mango hanging from a tree"
                />
                <span className="count-badge">03 / 03</span>
                <span className="season-badge">Jun - Jul</span>
              </div>
              <div className="mango-card-body">
                <h3>Langra</h3>
                <p>Tangy - Pulpy - Citrus zest</p>
              </div>
            </article>
          </div>

          <figure className="varieties-quote">
            <blockquote>
              "We don't pick by the calendar. We pick by the fruit - when its
              sugar and acid agree, and not a day before."
            </blockquote>
            <figcaption>Vikram Desai - Head grower</figcaption>
          </figure>
        </div>
      </section>

      <section className="benefits-section" id="benefits">
        <div className="benefits-content">
          <div className="benefits-image">
            <img
              src={whyMangoesImage}
              alt="A ripe mango being sliced by hand"
            />
          </div>
          <div className="benefits-text">
            <p className="benefits-kicker">03 - WHY OUR MANGOES</p>
            <h2>
              Good for the body. <span>Better for the soul.</span>
            </h2>
            <p className="benefits-intro">
              We grow with regenerative practices, irrigate with rain-fed
              cisterns, and let the fruit ripen on the tree. The result is a
              mango that tastes the way a mango should.
            </p>

            <div className="benefits-grid">
              <article>
                <span className="benefit-icon"><Heart size={20} /></span>
                <h3>Heart-friendly</h3>
                <p>
                  Naturally rich in dietary fibre and potassium that support
                  cardiovascular wellbeing.
                </p>
              </article>
              <article>
                <span className="benefit-icon"><Sun size={20} /></span>
                <h3>Daily Vitamin A</h3>
                <p>
                  A single Alphonso delivers more than half your day's vitamin A
                  from beta-carotene.
                </p>
              </article>
              <article>
                <span className="benefit-icon"><Sparkle size={20} /></span>
                <h3>No carbide, no spray</h3>
                <p>
                  Picked, washed and packed the same morning - naturally
                  tree-ripened, exactly as it should be.
                </p>
              </article>
              <article>
                <span className="benefit-icon"><FlaskConical size={20} /></span>
                <h3>Lab-tested sweetness</h3>
                <p>
                  Every lot is brix-tested. We only ship fruit that scores
                  between 16 and 22.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="orchard-section" id="orchard">
        <div className="orchard-content">
          <div className="orchard-image">
            <img
              src={orchardImage}
              alt="Rows of mango trees in a sunlit orchard"
            />
          </div>
          <div className="orchard-text">
            <p className="orchard-kicker">04 - OUR ORCHARD</p>
            <h2>
              An orchard with a <span>memory.</span>
            </h2>
            <p>
              In 1972, our grandfather Anand planted seventy Alphonso saplings
              on a sea-facing slope above the village of Devgad. Three
              generations later, those same trees still produce the most
              fragrant fruit on the farm.
            </p>
            <blockquote>
              "We don't farm mangoes. We tend a place - and the place gives us
              mangoes."
            </blockquote>
            <p>
              Today, the family of seventy acres feeds families across the
              country. We pack only what we pick, and we never grow what we
              wouldn't bring to our own kitchen table.
            </p>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-container">
          <div className="boxes-header">
            <div>
              <p className="contact-kicker">The harvest</p>
              <h2>
                Three boxes. <br />
                One <span>golden</span> promise.
              </h2>
            </div>
            <p>
              Each box travels under 24 hours from the orchard. Pick the size
              that suits your family - we'll handle the rest.
            </p>
          </div>

          <div className="box-grid" aria-label="Mango box options">
            {boxOptions.map((box) => {
              const isSelected = bookingItems.some((item) => item.boxId === box.id);

              return (
                <article className={`box-card ${isSelected ? "is-selected" : ""}`} key={box.id}>
                  {box.badge && <span className="best-value">{box.badge}</span>}
                  <div className="box-card-top">
                    <span className="box-icon"><Package size={16} /></span>
                    <span className="box-count">Box of <strong>{box.count}</strong></span>
                  </div>
                  <h3>{box.title}</h3>
                  <p>{box.description}</p>
                  <div className="box-weight">
                    <span>Weight / piece</span>
                    <strong>{box.weight}</strong>
                  </div>
                  <div className="box-price">
                    <strong>{formatPrice(box.price)}</strong>
                    <span>per box</span>
                  </div>
                  <button type="button" onClick={() => togglePack(box.id)}>
                    {isSelected ? <><Check size={15} /> Deselect pack</> : "Select this pack"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="booking-panel">
          <div className="booking-heading">
            <span>Book now</span>
            <h2>
              Reserve your <em>mango box.</em>
            </h2>
            <p>Fill in your details - we'll call to confirm dispatch within 24 hours.</p>
          </div>

          <div className="contact-form-wrapper">
            <form className="contact-form" onSubmit={goToCheckout}>
              <div className="box-choice booking-lines">
                <span>Build your booking *</span>
                {bookingItems.map((item, index) => {
                  const itemBox = getBox(item.boxId);
                  const itemMango = getMango(item.mangoId);
                  const itemTotal = itemBox.price * item.quantity;

                  return (
                    <div className="booking-line" key={item.id}>
                      <div className="booking-line-title">
                        <strong>Box {index + 1}</strong>
                        <span>
                          {itemMango.name} - {itemBox.title} - {formatPrice(itemTotal)}
                        </span>
                      </div>
                      <label>
                        <span>Mango variety</span>
                        <select
                          value={item.mangoId}
                          onChange={(event) =>
                            updateBookingItem(item.id, "mangoId", event.target.value)
                          }
                        >
                          {mangoOptions.map((mango) => (
                            <option value={mango.id} key={mango.id}>
                              {mango.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Family pack</span>
                        <select
                          value={item.boxId}
                          onChange={(event) =>
                            updateBookingItem(item.id, "boxId", event.target.value)
                          }
                        >
                          {boxOptions.map((box) => (
                            <option value={box.id} key={box.id}>
                              {box.title} - {box.count} pcs - {formatPrice(box.price)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Boxes</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateBookingItem(
                              item.id,
                              "quantity",
                              Math.max(1, Number(event.target.value) || 1),
                            )
                          }
                          required
                        />
                      </label>
                      <button
                        className="remove-line"
                        type="button"
                        disabled={bookingItems.length === 1}
                        onClick={() => removeBookingItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button className="add-line" type="button" onClick={() => addBookingItem()}>
                  Add another mango / pack
                </button>
              </div>

              <div className="form-row">
                <label>
                  <span>Full name *</span>
                  <input
                    type="text"
                    value={customerDetails.fullName}
                    onChange={(event) => updateCustomerDetails("fullName", event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Phone (10 digits) *</span>
                  <input
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(event) => updateCustomerDetails("phone", event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={customerDetails.email}
                    onChange={(event) => updateCustomerDetails("email", event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Delivery address *</span>
                <textarea
                  rows="3"
                  value={customerDetails.address}
                  onChange={(event) => updateCustomerDetails("address", event.target.value)}
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  <span>City *</span>
                  <input
                    type="text"
                    value={customerDetails.city}
                    onChange={(event) => updateCustomerDetails("city", event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Pincode (6 digits) *</span>
                  <input
                    type="text"
                    value={customerDetails.pincode}
                    onChange={(event) => updateCustomerDetails("pincode", event.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                <span>Notes (optional)</span>
                <textarea
                  placeholder="Preferred delivery date, gift message, etc."
                  rows="3"
                  value={customerDetails.notes}
                  onChange={(event) => updateCustomerDetails("notes", event.target.value)}
                />
              </label>
              <div className="booking-footer">
                <p>Order total: <strong>{formatPrice(orderTotal)}</strong></p>
                <button type="submit" className="send-button">Confirm booking</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <span>Aamra - Premium Mangoes</span>
        <span>Delivering sun-ripened freshness</span>
      </footer>
    </main>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
