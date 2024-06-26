import { OrderBookContract, spotOrderEntity } from "generated";
import crypto from 'crypto';

function tai64ToDate(tai64: bigint) {
  const dateStr = (
    (tai64 - BigInt(Math.pow(2, 62)) - BigInt(10)) *
    1000n
  ).toString();
  return new Date(+dateStr).toISOString();
}

function decodeI64(i64: {
  readonly value: bigint;
  readonly negative: boolean;
}) {
  return (i64.negative ? "-" : "") + i64.value.toString();
}

OrderBookContract.MarketCreateEvent.loader(({ event, context }) => { });


OrderBookContract.MarketCreateEvent.handler(({ event, context }) => {
  const idSource = `${event.data.asset_decimals}-${event.data.asset_id.bits}-${tai64ToDate(event.data.timestamp)}-${event.transactionId}`;
  const id = crypto.createHash('sha256').update(idSource).digest('hex');
  context.SpotMarketCreateEvent.set({
    id: id,
    asset_decimals: event.data.asset_decimals,
    asset_id: event.data.asset_id.bits,
    timestamp: tai64ToDate(event.data.timestamp),
    tx_id: event.transactionId,
  });
});

OrderBookContract.OrderChangeEvent.loader(({ event, context }) => {
  if (event.data.order) {
    context.SpotOrder.load(event.data.order.id);
  }
});

OrderBookContract.OrderChangeEvent.handler(({ event, context }) => {
  const eventOrder = event.data.order;
  const timestamp = tai64ToDate(event.data.timestamp);
  const order: spotOrderEntity | null = eventOrder
    ? {
      id: eventOrder.id,
      trader: eventOrder.trader.bits,
      base_token: eventOrder.base_token.bits,
      base_size: decodeI64(eventOrder.base_size),
      order_type:
        eventOrder.base_size.value === 0n
          ? undefined
          : eventOrder.base_size.negative
            ? "sell"
            : "buy",
      base_price: eventOrder.base_price,
      timestamp,
    }
    : null;
  const idSource = `${event.transactionId}-${timestamp}-${event.data.order_id}`;
  const id = crypto.createHash('sha256').update(idSource).digest('hex');
  context.SpotOrderChangeEvent.set({
    id: id,
    order_id: event.data.order_id,
    new_base_size: order ? order.base_size : "0",
    timestamp,
    identifier: event.data.identifier.case,
    tx_id: event.transactionId,
  });

  if (order) {
    const maybeExistingOrder = context.SpotOrder.get(order.id);
    if (maybeExistingOrder) {
      context.SpotOrder.set({
        ...maybeExistingOrder,
        base_size: order.base_size,
      });
    } else {
      context.SpotOrder.set(order);
    }
  }
});

OrderBookContract.TradeEvent.loader(({ event, context }) => { });

OrderBookContract.TradeEvent.handler(({ event, context }) => {
  const idSource = `${event.data.base_token.bits}-${event.data.order_matcher.bits}-${event.data.seller.bits}-${event.data.buyer.bits}-${event.data.trade_size}-${event.data.trade_price}-${event.data.sell_order_id}-${event.data.buy_order_id}-${tai64ToDate(event.data.timestamp)}-${event.transactionId}`;
  const id = crypto.createHash('sha256').update(idSource).digest('hex');
  context.SpotTradeEvent.set({
    id: id,
    base_token: event.data.base_token.bits,
    order_matcher: event.data.order_matcher.bits,
    seller: event.data.seller.bits,
    buyer: event.data.buyer.bits,
    trade_size: event.data.trade_size,
    trade_price: event.data.trade_price,
    sell_order_id: event.data.sell_order_id,
    buy_order_id: event.data.buy_order_id,
    timestamp: tai64ToDate(event.data.timestamp),
    tx_id: event.transactionId,
  });
});
