"use client";

import { useState } from "react";
import { JOB_TYPES, INDUSTRIES, CONNECT_TAGS } from "@/lib/constants";
import { completeOnboarding, skipOnboarding } from "@/app/onboarding/actions";
import type { Profile } from "@/lib/types";

const STEPS = ["åŸºæœ¬æƒ…å ±", "èˆˆå‘³ãƒ»é–¢å¿ƒ", "è‡ªå·±ç´¹ä»‹"] as const;

export default function OnboardingWizard({
  profile,
}: {
  profile: Profile | null;
}) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  return (
    <form action={completeOnboarding}>
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 w-6 bg-gray-200" />}
          </div>
        ))}
      </div>
      <p className="mb-5 text-center text-sm font-semibold text-gray-500">
        {STEPS[step]}({step + 1}/{STEPS.length})
      </p>

      <div className="card space-y-4" hidden={step !== 0}>
        <div>
          <label className="label">ä¼šç¤¾åãƒ»æ‰€å±</label>
          <input
            name="company"
            className="input"
            placeholder="ä¾‹: æ ªå¼ä¼šç¤¾ARKIVE"
            defaultValue={profile?.company || ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">å½¹è·</label>
            <input
              name="job_title"
              className="input"
              placeholder="ä¾‹: ä»£è¡¨å–ç· å½¹"
              defaultValue={profile?.job_title || ""}
            />
          </div>
          <div>
            <label className="label">è·ç¨®</label>
            <input
              name="job_type"
              list="job-type-list"
              className="input"
              defaultValue={profile?.job_type || ""}
            />
            <datalist id="job-type-list">
              {JOB_TYPES.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="card space-y-4" hidden={step !== 1}>
        <div>
          <label className="label">æ¥­ç¨®</label>
          <input
            name="industry"
            list="industry-list"
            className="input"
            defaultValue={profile?.industry || ""}
          />
          <datalist id="industry-list">
            {INDUSTRIES.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>
        <div>
          <p className="label">ç¹‹ãŒã‚ŠãŸã„äººã®ã‚¿ã‚¤ãƒ—</p>
          <div className="flex flex-wrap gap-2">
            {CONNECT_TAGS.map((tag) => (
              <label
                key={tag}
                className="chip has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white border-gray-200 text-gray-500"
              >
                <input
                  type="checkbox"
                  name="connect_with_tags"
                  value={tag}
                  defaultChecked={profile?.connect_with_tags?.includes(tag)}
                  className="hidden"
                />
                {tag}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label">ç¹‹ãŒã‚ŠãŸã„äººã«ã¤ã„ã¦(è‡ªç”±è¨˜è¿°)</label>
          <textarea
            name="connect_with"
            className="input"
            rows={3}
            defaultValue={profile?.connect_with || ""}
          />
        </div>
      </div>

      <div className="card space-y-4" hidden={step !== 2}>
        <div>
          <label className="label">è‡ªå·±ç´¹ä»‹(å‚åŠ è€…åç°¿ã«è¡¨ç¤ºã•ã‚Œã¾ã™)</label>
          <textarea
            name="bio"
            className="input"
            rows={4}
            placeholder="äº‹æ¥­å†…å®¹ã‚„å¾—æ„åˆ†é‡ã€äº¤æµä¼šã§ãŠè©±ã—ã—ãŸã„ã“ã¨ãªã©ã€è‡ªç”±ã«ã”è¨˜å…¥ãã ã•ã„ã€‚\(ãƒ»ãƒƒãƒˆ)
            defaultValue={profile?.bio || ""}
        Ï‚ˆÙ]‚ˆ]‚ˆX™[Û\ÜÓ˜[YOH›X™[ºfîú*lyåj¹cíÊ9.îù¡#ÊOÛX™[‚ˆ[œ]ˆ˜[YOHœÛ™H‚ˆ\OH[‚ˆÛ\ÜÓ˜[YOHš[œ]‚ˆXÙZÛ\H¹/¢ÎˆLLLŒÍMMÎ‚ˆY˜][˜[YO^Ü›Ùš[OËœÛ™HˆŸBˆÏ‚ˆÛ\ÜÓ˜[YOH›]LH^^È^YÜ˜^KM‚ˆ:`bùe­¸àbøà¢xàk¹íâ¹ )z`(ùíhxàk¸àoøàjù/oùå*8àeøà y.å¸àk¹cà¹b¨: !xàjøàkùak:e¢øàexà£8ào¸àføà¤øà ‚ˆÜ‚ˆÙ]‚ˆÙ]‚‚ˆ]ˆÛ\ÜÓ˜[YOH›]Mˆ›^Ø\LÈ‚ˆÜİ\ˆ	‰ˆ
ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆÙ]İ\

ÊHOˆÈHJ_BˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\H›^LH‚ˆ‚ˆ9¢.øà¢ÂˆØ]Û‚ˆ
_BˆÈ[\İÈ
ˆ]Û‚ˆ\OH˜]Ûˆ‚ˆÛÛXÚÏ^Ê
HOˆÙ]İ\

ÊHOˆÈ
ÈJ_BˆÛ\ÜÓ˜[YOH˜‹\š[X\H›^LH‚ˆ‚ˆ9«(xànˆØ]Û‚ˆ
Hˆ
ˆ]Ûˆ\OHœİX›Z]ˆÛ\ÜÓ˜[YOH˜‹\š[X\H›^LH‚ˆ8àkøàf8à xà¢ÂˆØ]Û‚ˆ
_BˆÙ]‚‚ˆÛ\ÜÓ˜[YOH›]M^XÙ[\ˆ‚ˆ]Û‚ˆ\OHœİX›Z]‚ˆ›Ü›PXİ[Û^ÜÚÚ\Û˜›Ø\™[™ßBˆÛ\ÜÓ˜[YOH^^È^YÜ˜^KM[™\›[™H‚ˆ‚ˆ8à`¸àj8àiùaiyb¦øàfxà¢ÂˆØ]Û‚ˆÜ‚ˆÙ›Ü›O‚ˆ
NÂŸB