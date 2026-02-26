import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

export function useFaceApi() {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelsError, setModelsError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);

                if (isMounted) setModelsLoaded(true);
            } catch (err) {
                console.error("Lỗi tải AI Models:", err);
                if (isMounted) setModelsError("Không thể tải hệ thống AI. Vui lòng kiểm tra lại mạng kết nối (Cần tải các file nặng khoảng 10-20MB).");
            }
        };

        loadModels();

        return () => {
            isMounted = false;
        };
    }, []);

    return { modelsLoaded, modelsError };
}
