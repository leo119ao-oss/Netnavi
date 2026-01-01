'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'react-qr-code';
import { QrCode, Download, Home } from 'lucide-react';
import Link from 'next/link';

export default function QRCodePage() {
  const [url, setUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // クライアントサイドで現在のURLを取得
    if (typeof window !== 'undefined') {
      setUrl(window.location.origin);
    }
  }, []);

  const handleDownload = () => {
    if (!isClient) return;
    
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'netnavi-qr-code.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-500/20 rounded-full">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">NetNavi QRコード</h1>
          <p className="text-slate-400">
            このQRコードをスマートフォンでスキャンして<br />
            アプリを開いてください
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl flex justify-center">
          <div id="qr-code-container" className="flex justify-center">
            <QRCodeSVG
              id="qr-code-svg"
              value={url}
              size={256}
              level="H"
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-slate-400">URL:</p>
          <p className="text-sm font-mono break-all text-slate-200">{url}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            QRコードをダウンロード
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            ホームに戻る
          </Link>
        </div>

        <div className="text-center text-sm text-slate-500 space-y-1">
          <p>📱 スマートフォンでカメラアプリを開き</p>
          <p>このQRコードをスキャンしてください</p>
        </div>
      </div>
    </div>
  );
}

