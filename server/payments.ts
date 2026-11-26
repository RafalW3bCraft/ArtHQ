import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentStage, ProjectOrder } from "../shared/business";
import type { BusinessStore } from "./business-store";

export const paymentsConfigured = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
  );
export function validSignature(
  value: string,
  signature: string,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(
      createHmac("sha256", secret).update(value).digest("hex"),
      "hex",
    ),
    Buffer.from(signature, "hex"),
  );
}
export async function razorpay(path: string, body?: unknown) {
  if (!paymentsConfigured())
    throw Object.assign(
      new Error(
        "Online payment is not available yet. Please contact the team.",
      ),
      { status: 503 },
    );
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Object.assign(
      new Error(
        "Payment provider could not complete the request. Contact the team before trying again.",
      ),
      { status: 502 },
    );
  return response.json();
}
export async function recordPayment(
  store: BusinessStore,
  providerPayment: any,
) {
  const reference = await store.get<{
    id: string;
    orderId: string;
    stage: PaymentStage;
  }>("payment_orders", providerPayment.order_id);
  if (!reference)
    throw Object.assign(new Error("Unknown payment order"), { status: 404 });
  return store.change<ProjectOrder>("orders", reference.orderId, (order) => {
    if (!order)
      throw Object.assign(new Error("Order not found"), { status: 404 });
    const payment = order.payments[reference.stage];
    if (
      !payment ||
      payment.providerOrderId !== providerPayment.order_id ||
      payment.amount !== providerPayment.amount ||
      providerPayment.currency !== "INR"
    )
      throw Object.assign(new Error("Payment details do not match"), {
        status: 400,
      });
    if (providerPayment.status !== "captured") return order;
    if (payment.state === "paid") {
      if (payment.paymentId !== providerPayment.id)
        throw Object.assign(new Error("Duplicate payment needs review"), {
          status: 409,
        });
      return order;
    }
    if (payment.state === "refunded") return order;
    payment.state = "paid";
    payment.paymentId = providerPayment.id;
    payment.paidAt = new Date().toISOString();
    if (order.status !== "cancelled" && reference.stage === "booking")
      order.status = "review";
    if (order.status !== "cancelled" && reference.stage === "approval")
      order.status = "in_progress";
    if (order.status !== "cancelled" && reference.stage === "delivery")
      order.status = "delivered";
    order.updatedAt = new Date().toISOString();
    return order;
  });
}

export async function recordRefund(store: BusinessStore, payment: any) {
  const reference = await store.get("payment_orders", payment.order_id);
  if (!reference)
    throw Object.assign(new Error("Unknown refund payment order"), {
      status: 404,
    });
  return store.change<ProjectOrder>("orders", reference.orderId, (order) => {
    if (!order)
      throw Object.assign(new Error("Order not found"), { status: 404 });
    const p = order.payments[reference.stage as PaymentStage];
    if (
      !p ||
      p.providerOrderId !== payment.order_id ||
      p.amount !== payment.amount ||
      payment.currency !== "INR" ||
      (p.paymentId && p.paymentId !== payment.id)
    )
      throw Object.assign(new Error("Refund does not match this payment"), {
        status: 400,
      });
    if (
      !Number.isSafeInteger(payment.amount_refunded) ||
      payment.amount_refunded < 0 ||
      payment.amount_refunded > p.amount
    )
      throw Object.assign(new Error("Invalid refunded amount"), {
        status: 400,
      });
    p.paymentId = payment.id;
    p.refundedAmount = Math.max(p.refundedAmount || 0, payment.amount_refunded);
    if (p.refundedAmount >= p.amount) {
      p.state = "refunded";
      order.status = "cancelled";
    }
    order.updatedAt = new Date().toISOString();
    return order;
  });
}
