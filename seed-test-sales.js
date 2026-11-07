const mongoose = require("mongoose");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const SaleSchema = new mongoose.Schema(
  {
    email: String,
    name: String,
    amount: Number,
    date: Date,
    orderId: String,
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", SaleSchema);

mongoose
  .connect(uri)
  .then(async () => {
    console.log("Adding test sales data...\n");

    const testSales = [
      // Customer 1 - should be VIP (₦55,000 = way below but let's add multiple orders totaling more)
      {
        email: "customer1@example.com",
        name: "Customer",
        amount: 30000000,
        date: new Date("2025-11-30"),
        orderId: "ORD001",
      },

      // Customer 2 - should be LOYAL
      {
        email: "sudaissalisu@gmail.com",
        name: "SUDAIS SALISU KAILA",
        amount: 10920,
        date: new Date("2025-12-08"),
        orderId: "ORD002",
      },

      // Customer 3 - should be REGULAR
      {
        email: "happtasatras@gmail.com",
        name: "SUDAIS SALISU KAILA",
        amount: 2237,
        date: new Date("2025-12-27"),
        orderId: "ORD003",
      },
    ];

    // Clear existing sales
    await Sale.deleteMany({});

    // Insert test sales
    const inserted = await Sale.insertMany(testSales);
    console.log(`✓ Inserted ${inserted.length} test sales records`);

    // Verify with aggregation
    const topCustomers = await Sale.aggregate([
      {
        $group: {
          _id: "$email",
          customerName: { $first: "$name" },
          totalSpent: { $sum: "$amount" },
          purchases: { $sum: 1 },
          lastPurchase: { $max: "$date" },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
    ]);

    console.log("\n=== CURRENT TOP CUSTOMERS ===\n");
    topCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.customerName}`);
      console.log(`   Email: ${c._id}`);
      console.log(`   Total Spent: ₦${c.totalSpent.toLocaleString()}`);
      console.log(`   Purchases: ${c.purchases}`);
      console.log("");
    });

    process.exit(0);
  })
  .catch((error_) => {
    console.error("Error:", error_.message);
    process.exit(1);
  });
