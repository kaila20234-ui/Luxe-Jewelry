const mongoose = require("mongoose");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const SaleSchema = new mongoose.Schema({}, { strict: false });

const Sale = mongoose.model("Sale", SaleSchema);

mongoose
  .connect(uri)
  .then(async () => {
    const count = await Sale.countDocuments();
    console.log("Total sales records:", count);

    if (count > 0) {
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
        {
          $limit: 3,
        },
      ]);

      console.log("\n=== TOP CUSTOMERS (from Sales) ===\n");
      topCustomers.forEach((c, i) => {
        console.log(`${i + 1}. ${c.customerName}`);
        console.log(`   Email: ${c._id}`);
        console.log(`   Total Spent: ${c.totalSpent}`);
        console.log(`   Purchases: ${c.purchases}`);
        console.log("");
      });
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
