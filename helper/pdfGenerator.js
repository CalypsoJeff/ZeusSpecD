const PDFDocument = require("pdfkit");
const Order = require("../models/orderModel");
const User = require("../models/usermodels");

const generateInvoicePdf = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const orderId = req.query.id;

    const orders = await Order.findOne({ user: userId, _id: orderId })
      .populate({
        path: "products.product",
        select: "title primaryImage",
      })
      .populate("address")
      .exec();

    if (!orders) {
      return res.status(404).send("Order details not found");
    }

    const doc = new PDFDocument();

    doc.text("ZeusSpec", { align: "center" });
    doc.moveDown();

    doc.text("Order Invoice", { align: "center" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown();

    doc.text(`Order ID: ORD${String(orders._id.toString()).padStart(5, "0")}`, {
      fontSize: 12,
    });
    doc.text(`Customer Name: ${user.username || "N/A"}`, {
      fontSize: 12,
    });

    for (const item of orders.products) {
      console.log("Item:", item); // Log the item object

      const product = item.product;

      if (product) {
        const salePrice = product.salePrice || item.price;
        doc.text(`Product: ${product.title}`, { fontSize: 12 });
        doc.text(`Quantity: ${item.quantity}`, { fontSize: 12 });
        doc.text(`Price: Rs.${salePrice}`, { fontSize: 12 });
        doc.text(`Status: ${orders.status || "N/A"}`, { fontSize: 12 });
        doc.moveDown();
      }
    }

    const totalPrice = orders.products.reduce(
      (sum, item) =>
        sum + (item.product.salePrice || item.price) * item.quantity,
      0
    );
    doc.text(`Order Total: Rs.${totalPrice}`, { fontSize: 12 });
    doc.text(`Address: ${orders.address.address || "N/A"}`, {
      fontSize: 12,
    });
    doc.text(`Payment Method: ${orders.paymentMethod || "N/A"}`, {
      fontSize: 12,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  generateInvoicePdf,
};
