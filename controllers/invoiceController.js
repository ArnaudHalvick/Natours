const PDFDocument = require("pdfkit");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const path = require("path");

const generateInvoicePDF = async booking => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  let buffers = [];
  doc.on("data", chunk => buffers.push(chunk));

  const pdfReadyPromise = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  // Company Logo and Header
  const logoPath = path.join(__dirname, "../public/img/logo-green-round.png");
  doc
    .image(logoPath, 50, 45, { width: 60 })
    .fontSize(20)
    .fillColor("#333")
    .text("Natours Adventures Inc.", 120, 50)
    .fontSize(10)
    .fillColor("#555")
    .text("123 Scenic Drive, Natureville, Earth 10101", 120, 75)
    .text("Phone: +1-800-555-TOUR", 120, 90)
    .text("Email: info@natours.com", 120, 105)
    .text("Website: www.natours.com", 120, 120);

  // Separator Line
  doc.moveTo(50, 140).lineTo(550, 140).lineWidth(1).stroke("#eaeaea");

  // Invoice Title and Info
  doc
    .fontSize(16)
    .fillColor("#333")
    .text("Invoice", 400, 150, { align: "right" })
    .fontSize(10)
    .text(`Invoice ID: ${booking.id}`, { align: "right" })
    .text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });

  // Customer Info
  doc
    .fontSize(12)
    .fillColor("#333")
    .text("Billed To:", 50, 160)
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#555")
    .text(`${booking.user.name}`)
    .text(`${booking.user.email}`);

  // Booking Details Section
  doc
    .moveDown(2)
    .fontSize(12)
    .fillColor("#333")
    .text("Booking Details:", { underline: true });

  const detailsTop = doc.y;

  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#555")
    .text(`Tour Name: ${booking.tour.name}`)
    .text(`Start Date: ${new Date(booking.startDate).toLocaleDateString()}`)
    .text(`Participants: ${booking.numParticipants}`)
    .text(`Total Amount: $${booking.price.toFixed(2)}`);

  const contentBottom = doc.y;

  // Add background box after content
  doc
    .rect(48, detailsTop - 10, 500, contentBottom - detailsTop + 20)
    .fillOpacity(0.1)
    .fill("#f9f9f9")
    .strokeOpacity(0)
    .fillAndStroke();

  // Footer text after the box
  doc
    .moveDown(4)
    .fontSize(10)
    .fillColor("#000")
    .text(
      [
        "Thank you for booking with Natours Adventures!",
        "We hope you have an amazing experience!",
        "For questions, contact us at info@natours.com or call +1-800-555-TOUR.",
      ].join("\n"),
      { align: "center" },
    );

  doc.end();

  return await pdfReadyPromise;
};

// Main controller to handle invoice download
exports.downloadInvoice = catchAsync(async (req, res, next) => {
  const { transactionId } = req.params;

  // 1) Find the corresponding booking
  const booking = await Booking.findById(transactionId).populate("tour user");
  if (!booking) {
    return next(new AppError("Transaction not found.", 404));
  }

  // 2) Ensure the currently logged-in user is the owner (or an admin)
  //    i.e., booking.user.id === req.user.id, or user.role === 'admin'
  if (booking.user.id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to access this invoice.", 403),
    );
  }

  // 3) Generate the PDF using our helper function
  const invoiceBuffer = await generateInvoicePDF(booking);

  // 4) Send the PDF as a downloadable file
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${transactionId}.pdf`,
  );

  // If you want to stream the file:
  // return res.end(invoiceBuffer);
  // or just res.send() also works

  return res.send(invoiceBuffer);
});
