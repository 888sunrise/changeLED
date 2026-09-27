/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, CornerDownRight, Lightbulb, Building, Store, Car, Key, Calendar } from 'lucide-react';

interface FlowchartViewProps {
  onSelectStep?: (stepId: number) => void;
}

export const FlowchartView: React.FC<FlowchartViewProps> = ({ onSelectStep }) => {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>事前調査判定 Yes/No 分岐ロジックフロー</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              全灯LED化の有無による調査要否の判断、設置場所の自然な3区分判定、および夜間作業時の戸締り確認トリガーの全景図です。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              全灯済＝案件終了
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              <Calendar className="w-3.5 h-3.5" />
              一部未＝要訪問調査
            </span>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs overflow-x-auto">
        <div className="min-w-[700px] flex flex-col items-center">
          {/* Node 1: Start */}
          <div
            onClick={() => onSelectStep?.(1)}
            className="w-80 cursor-pointer p-4 rounded-lg bg-slate-900 text-white text-center shadow-xs hover:ring-2 hover:ring-blue-500 transition-all"
          >
            <div className="text-xs text-slate-400 font-medium">STEP 1</div>
            <div className="text-sm font-bold">架電・挨拶 & 趣旨説明</div>
            <div className="text-xs text-slate-300 mt-1">「2〜3分ほどLED照明の状況確認をお願いできますか？」</div>
          </div>

          {/* Arrow */}
          <div className="h-8 w-0.5 bg-slate-300 my-1"></div>

          {/* Node 2: Core Branch Decision */}
          <div
            onClick={() => onSelectStep?.(2)}
            className="w-96 cursor-pointer p-4 rounded-xl border-2 border-amber-400 bg-amber-50/50 text-center shadow-xs hover:shadow-md transition-all"
          >
            <div className="text-xs font-semibold text-amber-800">STEP 2 【最重要分岐判断】</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              店舗内の照明は全灯LED化済みか？
            </div>
            <div className="text-xs text-slate-600 mt-1">
              （客席・厨房・バックヤード・倉庫・外看板まで含む）
            </div>
          </div>

          {/* Branch Fork */}
          <div className="w-full max-w-2xl mt-4 relative">
            {/* Top horizontal branch bar */}
            <div className="grid grid-cols-2 gap-8 relative">
              {/* Branch Left: YES (全灯LED済み) */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>YES：全灯LED化済み</span>
                </div>
                <div className="h-6 w-0.5 bg-emerald-400"></div>

                {/* Termination Card */}
                <div className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-center shadow-xs">
                  <span className="text-xs font-bold text-emerald-800 tracking-wide">
                    【訪問調査：不要（免除）】
                  </span>
                  <div className="text-sm font-bold text-emerald-950 mt-1">
                    お礼トーク → 案件終了
                  </div>
                  <p className="text-xs text-emerald-800 mt-2 text-left leading-relaxed bg-white/70 p-2.5 rounded border border-emerald-200">
                    「全灯LED化が完了されているとのこと、ご対応誠にありがとうございます。今回の訪問調査は省略とさせていただきます。」
                  </p>
                  <div className="mt-3 text-xs font-semibold text-slate-600 bg-white py-1 px-2 rounded border border-slate-200 inline-block">
                    ステータス：案件完了（本部報告）
                  </div>
                </div>
              </div>

              {/* Branch Right: NO (一部未LED または 未着手) */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full mb-3">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>NO：一部未LED または 未着手</span>
                </div>
                <div className="h-6 w-0.5 bg-blue-400"></div>

                {/* Continue Survey Card */}
                <div className="w-full p-4 rounded-xl border-2 border-blue-500 bg-blue-50 text-center shadow-xs">
                  <span className="text-xs font-bold text-blue-800 tracking-wide">
                    【訪問調査：必要】
                  </span>
                  <div className="text-sm font-bold text-blue-950 mt-1">
                    事前調査手配フローへ進む
                  </div>
                  <p className="text-xs text-blue-800 mt-2 text-left leading-relaxed bg-white/70 p-2.5 rounded border border-blue-200">
                    「一部に蛍光灯が残っている状態ですね。正確な器具選定と見積もりのため、専門調査員が現地調査にお伺いします。」
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Under Right Branch: Sequential Steps for Survey Requirement */}
          <div className="w-full max-w-2xl mt-6 flex justify-end">
            <div className="w-1/2 pl-4 flex flex-col items-center">
              <div className="h-6 w-0.5 bg-blue-400 mb-2"></div>

              {/* Step 3: Location Classification */}
              <div
                onClick={() => onSelectStep?.(3)}
                className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 text-left shadow-xs hover:border-blue-400 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">STEP 3</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">3区分判定</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">設置場所区分の自然な判定</div>
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                    <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>ビル・商業施設内のテナント → <strong>【ビルトイン】</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                    <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>客席なし/カウンター厨房のみ → <strong>【フードコート】</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                    <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>駐車場灯あり・ロードサイド独立店 → <strong>【フリスタ】</strong></span>
                  </div>
                </div>
              </div>

              <div className="h-6 w-0.5 bg-blue-400 my-1"></div>

              {/* Step 4: Schedule Hearing */}
              <div
                onClick={() => onSelectStep?.(4)}
                className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 text-left shadow-xs hover:border-blue-400 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">STEP 4</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">日程調整</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">訪問希望日程・時間帯の聴取</div>
                <p className="text-xs text-slate-600 mt-1">
                  第1希望・第2希望、立会者名を確認（所要30〜45分）
                </p>

                {/* Sub-Branch Trigger Notice */}
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        【条件発動トリガー】
                      </div>
                      <div className="text-xs text-amber-800 leading-tight mt-0.5">
                        相手より「営業終了後」「夜間・閉店後の作業」を指定された場合のみ発動！
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-6 w-0.5 bg-amber-400 my-1"></div>

              {/* Step 5: Lock & Key Procedure (Conditional) */}
              <div
                onClick={() => onSelectStep?.(5)}
                className="w-full p-4 rounded-xl border-2 border-amber-400 bg-amber-50/70 text-left shadow-xs hover:border-amber-500 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">STEP 5（条件限定）</span>
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">夜間作業時のみ</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-700" />
                  <span>戸締り方法・鍵預かりの確認</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-700 list-disc list-inside bg-white/80 p-2 rounded border border-amber-200">
                  <li><strong>鍵預かりの可否</strong>（合鍵預託 or 店頭スタッフ立会い）</li>
                  <li><strong>施錠・返却の流れ</strong>（キーボックス投函、翌朝受渡、警備）</li>
                  <li><strong>夜間緊急連絡先</strong>の確保</li>
                </ul>
              </div>

              <div className="h-6 w-0.5 bg-slate-400 my-1"></div>

              {/* Step 6: Closing */}
              <div
                onClick={() => onSelectStep?.(6)}
                className="w-full p-4 rounded-xl border border-slate-300 bg-slate-900 text-white text-left shadow-xs"
              >
                <div className="text-xs text-slate-400">STEP 6</div>
                <div className="text-sm font-bold mt-0.5">復唱・確定連絡案内・終話</div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                  決定した訪問希望日時・区分・戸締り手順を復唱し、確定連絡（メール/電話）を案内して完了。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <span>訪問調査要否の決定基準</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            ・<strong>全灯LED済み</strong>：訪問調査は完全省略。お礼を伝えて案件終了（コスト削減）。<br />
            ・<strong>一部未LED / 未着手</strong>：器具規格・本数把握のため訪問調査が必須。
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span>設置場所区分の自然な聞き方</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            専門用語を使わず、「ビル内テナントか？」「客席はあるか（フードコートカウンターのみか）？」「駐車場や外灯はあるか？」の日常質問で【ビルトイン／フードコート／フリスタ】を即座に分類。
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span>戸締り確認の限定発動ルール</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            日中・アイドルタイムの作業であれば戸締り質問は不要。相手から「閉店後に」「夜間に」と指定された時のみ発動し、鍵預かりと返却手順を確実に控えます。
          </p>
        </div>
      </div>
    </div>
  );
};
