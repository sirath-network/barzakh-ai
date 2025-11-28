"use client";
import { getWithExpiry, setWithExpiry } from "@barzakh/shared/lib/utils/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  text: string;
};

function TextStrip() {
  const [show, setShow] = useState(false);

  const hideStrip = () => {
    const time = 24 * 60 * 60 * 1000; // 24 hour
    // const time = 10 * 1000; // 10 seconds
    setWithExpiry("RewardSystemNotifDismissed", "true", time);
    setShow(false);
  };

  useEffect(() => {
    const isDismissed = getWithExpiry("RewardSystemNotifDismissed");
    if (isDismissed) {
      setShow(false);
    } else {
      setShow(true);
      setTimeout(() => {
        hideStrip();
      }, 10000);
    }
  }, []);

  return (
    <>
      {show && (
        <div className="z-50 w-full flex justify-center items-center bg-barzakhOrange rounded-b-md py-1 px-3">
          <div className="flex flex-col sm:flex-row items-center">
          </div>
        </div>
      )}
    </>
  );
}

export default TextStrip;
