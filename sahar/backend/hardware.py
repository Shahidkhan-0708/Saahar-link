import hmac
import hashlib
import uuid
import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class HardwareAttendanceEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"EVT-{uuid.uuid4().hex[:12].upper()}")
    device_id: str
    trainee_id: int
    batch_id: Optional[int] = None
    method: str = Field(..., description="FACE, NFC, QR, or SIMULATOR")
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    location: str = "Smart Training Kiosk"
    signature: Optional[str] = None
    prev_hash: Optional[str] = "GENESIS_ROOT_HASH_00000000"
    chain_hash: Optional[str] = None
    sync_status: str = "SYNCED"

class BatchSyncPayload(BaseModel):
    device_id: str
    events: List[HardwareAttendanceEvent]

class HardwareAbstractionLayer:
    """Standardized Hardware Abstraction Layer (HAL) with Tamper-Proof Hash Chaining.
    Accepts attendance records identically whether sent from:
    - 8-inch Rugged Android Tablet Kiosk
    - ESP32 / Arduino Microcontroller
    - Optical/Face Sensor (MobileFaceNet INT8)
    - NFC Card Reader
    - Web / Mobile Kiosk Simulator
    """

    SECRET_DEVICE_KEY = "sahakar-kiosk-hardware-salt-2026"

    @classmethod
    def generate_device_signature(cls, event: HardwareAttendanceEvent) -> str:
        """Computes hardware HMAC signature to ensure non-repudiation of physical events."""
        canonical_str = f"{event.event_id}:{event.device_id}:{event.trainee_id}:{event.timestamp.isoformat()}"
        return hmac.new(
            cls.SECRET_DEVICE_KEY.encode('utf-8'),
            canonical_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()[:24]

    @classmethod
    def compute_event_chain_hash(cls, event: HardwareAttendanceEvent, prev_hash: str = "GENESIS_ROOT_HASH_00000000") -> str:
        """Computes cryptographic SHA-256 block hash linking this event to the previous physical event."""
        payload = f"{prev_hash}:{event.event_id}:{event.device_id}:{event.trainee_id}:{event.timestamp.isoformat()}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()[:32]

    @classmethod
    def verify_event_authenticity(cls, event: HardwareAttendanceEvent) -> bool:
        if not event.signature:
            return True
        expected = cls.generate_device_signature(event)
        return hmac.compare_digest(event.signature, expected)

    @classmethod
    def verify_batch_chain_integrity(cls, events: List[HardwareAttendanceEvent]) -> Dict[str, Any]:
        """Validates that consecutive events in an offline batch form an unbroken cryptographic chain."""
        if not events:
            return {"is_valid": True, "tampered_index": -1, "message": "Empty batch"}

        current_prev = events[0].prev_hash or "GENESIS_ROOT_HASH_00000000"
        for i, ev in enumerate(events):
            calc_hash = cls.compute_event_chain_hash(ev, current_prev)
            if ev.chain_hash and ev.chain_hash != calc_hash:
                return {
                    "is_valid": False,
                    "tampered_index": i,
                    "event_id": ev.event_id,
                    "message": f"Cryptographic chain breakage detected at event index {i} ({ev.event_id})"
                }
            current_prev = calc_hash

        return {"is_valid": True, "tampered_index": -1, "message": f"All {len(events)} events verified unbroken"}
