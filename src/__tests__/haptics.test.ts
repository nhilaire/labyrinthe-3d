// AC-34: light impact on an arrow, success notification at the exit, nothing when « Vibrations » is off.
import { createHaptics } from '../feedback/haptics';

function fakeNative() {
  return {
    impactAsync: jest.fn(() => Promise.resolve()),
    notificationAsync: jest.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  };
}

describe('haptics (AC-34)', () => {
  it('ticks lightly on an arrow and notifies success at the exit', () => {
    const native = fakeNative();
    const h = createHaptics(native as never);
    h.arrow();
    h.exit();
    expect(native.impactAsync).toHaveBeenCalledWith('light');
    expect(native.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('makes no haptic call when « Vibrations » is off', () => {
    const native = fakeNative();
    const h = createHaptics(native as never);
    h.setEnabled(false);
    h.arrow();
    h.exit();
    expect(native.impactAsync).not.toHaveBeenCalled();
    expect(native.notificationAsync).not.toHaveBeenCalled();
  });
});
