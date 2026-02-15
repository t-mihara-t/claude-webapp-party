import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS } from "@/types";
import type { Participant, Event } from "@/types";
import { Wallet, ExternalLink } from "lucide-react";

interface PaymentInfoProps {
  participant: Participant;
  event: Event;
}

export function PaymentInfo({ participant, event }: PaymentInfoProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const paymentLink = event.paypay_link || null;

  useEffect(() => {
    if (!paymentLink) return;

    let cancelled = false;
    QRCode.toDataURL(paymentLink, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) {
        setQrCodeUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [paymentLink]);

  if (participant.assigned_amount == null) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <Wallet className="h-8 w-8 text-orange-500 mx-auto" />
          <h3 className="text-xl font-bold">お支払い情報</h3>
        </div>

        <div className="text-center space-y-1">
          <span className="inline-block rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-sm font-medium">
            {ROLE_LABELS[participant.role]}
          </span>
          <p className="text-3xl font-extrabold tracking-tight mt-3">
            &yen;{participant.assigned_amount.toLocaleString("ja-JP")}
          </p>
          <p className="text-sm text-muted-foreground">お支払い金額</p>
        </div>

        {paymentLink ? (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full h-14 text-lg font-bold bg-red-500 hover:bg-red-600 text-white gap-2">
                  <ExternalLink className="h-5 w-5" />
                  PayPayで支払う
                </Button>
              </a>
            </div>

            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={qrCodeUrl}
                  alt="PayPay支払いQRコード"
                  className="rounded-lg shadow-sm"
                  width={200}
                  height={200}
                />
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  上のQRコードを読み取るか、ボタンをタップしてPayPayで支払いできます
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-center text-muted-foreground">
              支払い方法については幹事にお問い合わせください
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
