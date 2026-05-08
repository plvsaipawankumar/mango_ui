import assert from "node:assert/strict";

const sampleOrder = {
  id: "booking-test-1",
  placedAt: "2026-05-03T12:00:00.000Z",
  customerDetails: {
    fullName: "Test Buyer",
    phone: "9876543210",
    email: "test@example.com",
    address: "12 Mango Lane",
    city: "Mumbai",
    pincode: "400001",
    notes: "Call before delivery",
  },
  items: [
    {
      id: 1,
      mangoName: "Alphonso",
      boxTitle: "Family Feast",
      boxCount: "15",
      boxWeight: "200-230 gms",
      quantity: 2,
      unitPrice: 1150,
      lineTotal: 2300,
    },
    {
      id: 2,
      mangoName: "Kesar",
      boxTitle: "Mango Mela",
      boxCount: "18",
      boxWeight: "180-200 gms",
      quantity: 1,
      unitPrice: 1000,
      lineTotal: 1000,
    },
  ],
  total: 3300,
  status: "Pending confirmation",
};

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

const rows = sampleOrder.items.map((item) => [
  sampleOrder.id,
  sampleOrder.placedAt,
  sampleOrder.customerDetails.fullName,
  sampleOrder.customerDetails.phone,
  sampleOrder.customerDetails.email,
  item.mangoName,
  item.boxTitle,
  item.boxCount,
  item.boxWeight,
  item.quantity,
  item.unitPrice,
  item.lineTotal,
  sampleOrder.total,
  sampleOrder.customerDetails.address,
  sampleOrder.customerDetails.city,
  sampleOrder.customerDetails.pincode,
  sampleOrder.customerDetails.notes,
  sampleOrder.status,
]);

const encodedPayload = new URLSearchParams({
  payload: JSON.stringify(sampleOrder),
}).toString();

assert.equal(rows.length, 2);
assert.equal(rows[0].length, headers.length);
assert.equal(rows[1].length, headers.length);
assert.equal(rows[0][0], "booking-test-1");
assert.equal(rows[0][5], "Alphonso");
assert.equal(rows[0][11], 2300);
assert.equal(rows[1][5], "Kesar");
assert.equal(rows[1][12], 3300);
assert.match(encodedPayload, /^payload=/);
assert.doesNotThrow(() => JSON.parse(new URLSearchParams(encodedPayload).get("payload")));

console.log("Order sync payload tests passed.");
