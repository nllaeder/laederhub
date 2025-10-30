'use client';

export function DisconnectButton() {
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Constant Contact account?')) {
      return;
    }

    try {
      const response = await fetch('/api/cc/disconnect', { method: 'DELETE' });
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to disconnect. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      className="text-xs text-red-600 hover:text-red-700 underline"
    >
      Disconnect and start fresh
    </button>
  );
}
