const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const redirectURL =
  process.env.NODE_ENV === "production"
    ? `${process.env.SERVER_DEPLOY_URL}:${process.env.PORT}/api/auth/github/callback`
    : "http://localhost:8000/api/auth/github/callback";
const frontMainURL = "http://localhost:5173/";
// process.env.NODE_ENV === "production"
//   ? `${process.env.SERVER_DEPLOY_URL}/api/auth/github/callback`
//   : "http://localhost:5173/our";

const getGithubRedirectURL = (req, res) => {
  const githubAuthURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectURL}&scope=user`;
  res.json({ redirect: githubAuthURL });
};

const getGithubCallback = async (req, res) => {
  const { code } = req.query;

  //Authorization Code가 없는 경우
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // 깃허브 로그인이 불가한 개발 환경에서는 mock 데이터 사용
    if (process.env.NODE_ENV === "development2") {
      // Mock GitHub OAuth token response
      const mockTokenResponse = {
        access_token: "mock_github_access_token_123",
        token_type: "bearer",
        scope: "user",
      };

      // Mock GitHub user data
      const mockUserData = {
        login: "user555",
        id: "user555",
        name: "user555",
      };

      // JWT 토큰 생성
      const token = jwt.sign(
        {
          id: mockUserData.login,
          access_token: mockTokenResponse.access_token,
        },
        secret,
        {}
      );

      // Swagger 테스트를 위해 리다이렉트 대신 JSON 응답 반환
      const referer = req.headers.referer || "";
      const isSwaggerRequest = referer.includes("/api-docs");
      if (isSwaggerRequest) {
        return res
          .status(200)
          .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60 * 1000,
          })
          .json({
            success: true,
            message: "Mock authentication successful",
            userData: mockUserData,
            token,
          });
      }

      // 일반 요청의 경우 기존과 동일하게 쿠키 설정 및 리다이렉트
      return res
        .status(201)
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 60 * 60 * 1000,
        })
        .redirect(frontMainURL);
    }

    // 운영 환경에서는 실제 GitHub API 호출
    //Authorization Code를 사용하여 Github Access Token 가져오기
    const tokenResponse = await fetch(
      `https://github.com/login/oauth/access_token`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    const accessToken = tokenResponse.access_token;

    // AccessToken이 없다면 400 리턴
    if (!accessToken) {
      return res.status(400).json({ error: "Failed to retrieve access token" });
    }

    // AccessToken을 사용하여 Github 유저 정보 가져오기
    const userData = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => res.json());

    // 가져온 유저 ID를 JWT로 변환
    const token = jwt.sign(
      { id: userData.login, access_token: accessToken },
      secret,
      {}
    );

    // cookie에 JWT를 넣어준다.
    res
      .status(201)
      .cookie("token", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .redirect(frontMainURL);
  } catch (error) {
    console.error("Error during GitHub authentication:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const logout = (req, res) => {
  // "token" 쿠키 삭제
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json("로그아웃 되었습니다.");
};

// 프론트엔드 소스에서 mock login을 위한 API, swagger 에서는 login api로 대체 가능
const getMockToken = (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "개발 환경에서만 사용 가능합니다." });
  }

  const mockUserData = {
    login: "user555",
    id: "user555",
    name: "user555",
  };

  const token = jwt.sign(
    {
      id: mockUserData.login,
      access_token: "mock_access_token_123",
    },
    secret,
    {}
  );

  res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message: "Mock authentication successful",
      userData: mockUserData,
    });
};

module.exports = {
  getGithubCallback,
  getGithubRedirectURL,
  logout,
  getMockToken,
};
