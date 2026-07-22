import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function WebViewPage() {
  const { page } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef();

  const baseUrl = "https://bestway.pourcrete.com";

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const url = iframeRef.current?.contentWindow?.location?.href;

        // ✅ Detect login success (change this URL based on your app)
        if (url && url.includes("/dashboard")) {
          localStorage.setItem("isLoggedIn", "true");
          navigate("/dashboard");
        }
      } catch (e) {
        // Cross-origin error (ignore)
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`${baseUrl}/${page}`}
      style={{ width: "100%", height: "100vh", border: "none" }}
      title="WebView"
    />
  );
}