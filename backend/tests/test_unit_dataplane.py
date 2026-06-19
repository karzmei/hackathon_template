"""@unit test for the data-plane invariant (compliance angle, enforced by imports).

CLAUDE.md rule: the public source and steps 1-2 must never read the internal
baseline. We assert it structurally by scanning the module source, so a future edit
that imports the private plane into the public plane fails the build.
"""

import inspect
import unittest

import pipeline.step1_basic_filter as step1
import pipeline.step2_llm_filter as step2
import sources.public_source as public_source

_FORBIDDEN = ("private_source", "get_baseline", "BaselineProfile")


class DataPlaneSeparationTest(unittest.TestCase):
    def _assert_clean(self, module):
        src = inspect.getsource(module)
        for token in _FORBIDDEN:
            self.assertNotIn(
                token, src, f"{module.__name__} must not reference the private plane ({token})"
            )

    def test_public_source_is_clean(self):
        self._assert_clean(public_source)

    def test_step1_is_clean(self):
        self._assert_clean(step1)

    def test_step2_is_clean(self):
        self._assert_clean(step2)


if __name__ == "__main__":
    unittest.main()
